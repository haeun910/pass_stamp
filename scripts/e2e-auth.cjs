// 로그인·승인 흐름 자동 테스트. Google·카카오 화면을 거칠 수 없어서, 테스트용 회원과 세션을 DB에 직접 만들고
// Better Auth와 같은 방식으로 서명한 세션 쿠키를 브라우저에 넣어요. 그 뒤는 실제 서버와 화면을 그대로 써요.
//
// 준비: 로그인 설정(DATABASE_URL, BETTER_AUTH_SECRET, BETTER_AUTH_URL=http://localhost:3100,
//       GOOGLE_CLIENT_ID/SECRET, KAKAO_CLIENT_ID, ADMIN_EMAILS=admin@example.com, AGENT_MOCK=1)로
//       npm run build && npx next start -p 3100
// 실행: 같은 DATABASE_URL, BETTER_AUTH_SECRET을 넣고 node scripts/e2e-auth.cjs [캡처 폴더]
const { chromium } = require('playwright');
const fs = require('fs');
const { connect } = require('./e2e-session.cjs');

const BASE = process.env.BASE_URL || 'http://localhost:3100';
const ADMIN = 'admin@example.com';
const OUT = process.argv[2] || 'e2e-auth-shots';
fs.mkdirSync(OUT, { recursive: true });
let fails = 0;
const ok = (cond, name, extra = '') => {
  console.log(cond ? 'OK  ' : 'FAIL', name, extra);
  if (!cond) fails++;
};

(async () => {
  const { db, makeUser, sessionCookie } = await connect();
  const stamp = Date.now();

  const browser = await chromium.launch();
  const errors = [];
  async function context(cookie) {
    const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 } });
    if (cookie) await ctx.addCookies([cookie]);
    const page = await ctx.newPage();
    page.setDefaultTimeout(10000);
    page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
    page.on('console', (m) => {
      // 401·403처럼 테스트가 일부러 만든 응답의 콘솔 기록은 빼요.
      if (m.type() === 'error' && !/status of 40[134]/.test(m.text())) errors.push(m.text());
    });
    return { ctx, page };
  }
  const shot = (page, name) => page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });

  // 1. 로그인 전
  {
    const { ctx, page } = await context();
    await page.goto(BASE + '/');
    await shot(page, '01-landing');
    ok((await page.locator('header >> text=로그인').count()) === 1, '랜딩 헤더에 로그인 링크');
    ok((await page.locator('#beta').count()) === 1 && (await page.locator('#pricing').count()) === 0, '베타 동안 요금제 대신 베타 안내');
    ok((await page.locator('header >> text=요금').count()) === 0, '베타 동안 헤더에 요금 링크 없음');
    await page.goto(BASE + '/app');
    ok(/\/login\?next=%2Fapp$/.test(page.url()), '로그인 없이 /app → 로그인 화면', page.url());
    await shot(page, '02-login');
    ok((await page.locator('button:has-text("Google로 계속하기")').count()) === 1 && (await page.locator('button:has-text("카카오로 계속하기")').count()) === 1, '로그인 버튼 2개');
    // Google 버튼은 Google 로그인 화면으로 보내야 해요. 실제로 나가지 않게 가로채서 주소만 확인해요.
    let googleUrl = '';
    await page.route('https://accounts.google.com/**', (r) => { googleUrl = r.request().url(); return r.fulfill({ status: 200, body: 'ok' }); });
    await page.click('button:has-text("Google로 계속하기")');
    await page.waitForURL(/accounts\.google\.com/);
    const g = new URL(googleUrl);
    ok(g.searchParams.get('client_id') === process.env.GOOGLE_CLIENT_ID && g.searchParams.get('redirect_uri') === BASE + '/api/auth/callback/google', 'Google 로그인 주소(client_id, redirect_uri)', g.searchParams.get('redirect_uri'));
    let kakaoUrl = '';
    await page.goto(BASE + '/login');
    await page.route('https://kauth.kakao.com/**', (r) => { kakaoUrl = r.request().url(); return r.fulfill({ status: 200, body: 'ok' }); });
    await page.click('button:has-text("카카오로 계속하기")');
    await page.waitForURL(/kauth\.kakao\.com/);
    const k = new URL(kakaoUrl);
    ok(k.searchParams.get('redirect_uri') === BASE + '/api/auth/callback/kakao' && /account_email/.test(k.searchParams.get('scope') || ''), '카카오 로그인 주소(redirect_uri, 이메일 동의)', k.searchParams.get('scope'));
    await page.goto(BASE + '/login?error=account_blocked');
    ok((await page.locator('text=이용이 중지된 계정이에요').count()) === 1, '중지된 계정 오류 안내');
    await page.goto(BASE + '/app?demo=1');
    await page.waitForSelector('text=로그인 없이 예시를 보고 있어요');
    ok(page.url().includes('/apply/demo-hanbitpay'), '미리보기는 로그인 없이 예시로', page.url());
    await page.waitForSelector('text=한빛페이');
    await shot(page, '03-demo-guest');
    const r = await page.request.post(BASE + '/api/agent', { data: { agent: 'writer', context: { company: 'x' } } });
    ok(r.status() === 401, '로그인 없이 AI 요청 → 401', r.status());
    await ctx.close();
  }

  // 2. 승인 대기 사용자
  const userEmail = `user-${stamp}@example.com`;
  const userId = await makeUser(userEmail, '김지원', 'pending');
  {
    const { ctx, page } = await context(await sessionCookie(userId));
    await page.goto(BASE + '/app');
    await page.waitForSelector('text=이용 신청이 접수됐어요');
    await shot(page, '04-waiting');
    const r = await page.request.post(BASE + '/api/agent', { data: { agent: 'writer', context: { company: 'x' } } });
    ok(r.status() === 403 && (await r.json()).error.includes('승인'), '승인 대기 AI 요청 → 403', r.status());
    const a = await page.request.get(BASE + '/api/admin/users');
    ok(a.status() === 403, '승인 대기는 관리 API 불가', a.status());
    await page.goto(BASE + '/login');
    ok(page.url().endsWith('/app'), '로그인 상태에서 /login → /app', page.url());

    // 3. 관리자가 수락
    const admin = await context(await sessionCookie(await makeUser(ADMIN, '하은', 'pending')));
    await admin.page.goto(BASE + '/app');
    await admin.page.waitForSelector('text=가입 신청 관리');
    ok((await admin.page.locator('nav >> text=가입 신청 관리').first().isVisible()), '관리자 메뉴 보임(상태가 pending이어도 관리자는 승인)');
    await admin.page.goto(BASE + '/admin');
    await admin.page.waitForSelector(`text=${userEmail}`);
    await shot(admin.page, '05-admin-pending');
    const csrf = await admin.page.request.post(BASE + '/api/admin/users', { headers: { origin: 'http://evil.example' }, data: { action: 'approve', userId } });
    ok(csrf.status() === 403, '다른 사이트에서 보낸 관리 요청 차단', csrf.status());
    const self = await admin.page.request.post(BASE + '/api/admin/users', { data: { action: 'block', userId: (await db.query('select id from "user" where email=$1', [ADMIN])).rows[0].id } });
    ok(self.status() === 400, '관리자 계정은 중지 불가', self.status());
    const row = admin.page.locator('li', { hasText: userEmail });
    await row.locator('button:has-text("수락")').click();
    await admin.page.waitForSelector(`section:has-text("이용 중") >> text=${userEmail}`);
    const st = (await db.query('select status from "user" where id=$1', [userId])).rows[0].status;
    ok(st === 'approved', '수락하면 approved', st);

    // 4. 사용자 화면에서 승인 확인
    await page.goto(BASE + '/app');
    await page.waitForSelector('text=지원 현황');
    ok(true, '승인 뒤 앱 진입');
    const r2 = await page.request.post(BASE + '/api/agent', { data: { agent: 'writer', instruction: '테스트', context: { company: 'x' } } });
    ok(r2.status() === 200, '승인 뒤 AI 요청(모의 응답) 200', r2.status());
    // 계정별 저장: 이 계정의 키에 저장되고, 예전 키는 쓰지 않아요.
    await page.click('main button:has-text("새 지원 회사")');
    await page.waitForURL(/apply/);
    await page.fill('input[placeholder="예: 토스"]', '계정분리테스트');
    await page.waitForTimeout(800);
    const keys = await page.evaluate(() => Object.keys(localStorage));
    ok(keys.includes(`online-interviewer:v2:${userId}`) && !keys.includes('online-interviewer:v2'), '계정별 저장 키 사용', keys.join(','));
    await shot(page, '06-member-app');

    // 5. 관리자 이용 중지 → 바로 로그아웃
    admin.page.once('dialog', (d) => d.accept());
    await admin.page.locator('li', { hasText: userEmail }).locator('button:has-text("이용 중지")').click();
    await admin.page.waitForSelector(`section:has-text("이용 중지") >> text=${userEmail}`);
    const sessions = (await db.query('select count(*) n from session where "userId"=$1', [userId])).rows[0].n;
    ok(sessions === '0', '중지하면 세션 삭제', sessions);
    const r3 = await page.request.post(BASE + '/api/agent', { data: { agent: 'writer', context: { company: 'x' } } });
    ok(r3.status() === 401, '중지된 사용자 AI 요청 → 401', r3.status());
    await page.goto(BASE + '/settings');
    await page.waitForURL(/\/login/);
    ok(page.url().includes('/login'), '중지된 사용자 앱 → 로그인 화면', page.url());
    // 다시 허용
    await admin.page.locator('li', { hasText: userEmail }).locator('button:has-text("다시 허용")').click();
    await admin.page.waitForSelector(`section:has-text("이용 중") >> text=${userEmail}`);
    await admin.ctx.close();
    await ctx.close();
  }

  // 6. 다른 계정은 같은 브라우저에서 앞 계정의 데이터를 못 봐요 + 로그아웃하며 지우기
  {
    const { ctx, page } = await context(await sessionCookie(userId));
    await page.goto(BASE + '/app');
    await page.waitForSelector('text=지원 현황');
    // 같은 브라우저에 다른 승인 계정으로 바꿔 로그인
    const other = await makeUser(`other-${stamp}@example.com`, '이서연', 'approved');
    await page.evaluate((uid) => localStorage.setItem(`online-interviewer:v2:${uid}`, JSON.stringify({ version: 2, profile: {}, applications: [{ id: 'a1', company: '앞계정회사', docs: [], interviews: [] }] })), userId);
    await ctx.clearCookies();
    await ctx.addCookies([await sessionCookie(other)]);
    await page.goto(BASE + '/app');
    await page.waitForSelector('text=지원 현황');
    ok((await page.locator('text=앞계정회사').count()) === 0, '다른 계정의 서류는 보이지 않음');
    // 로그아웃하며 이 기기 데이터 지우기
    await page.evaluate((uid) => localStorage.setItem(`online-interviewer:v2:${uid}`, JSON.stringify({ version: 2, profile: {}, applications: [{ id: 'b1', company: '지울회사', docs: [], interviews: [] }] })), other);
    await page.reload();
    await page.waitForSelector('aside >> text=지울회사');
    await page.click('aside button[aria-label="로그아웃"]');
    await shot(page, '07-logout-confirm');
    await page.check('aside input[type="checkbox"]');
    await page.click('aside button:has-text("로그아웃") >> nth=-1');
    await page.waitForURL(BASE + '/');
    const left = await page.evaluate((uid) => localStorage.getItem(`online-interviewer:v2:${uid}`), other);
    ok(left === null, '로그아웃하며 이 기기 데이터 지움');
    const cookies = await ctx.cookies();
    ok(!cookies.some((c) => c.name.includes('session_token') && c.value), '로그아웃하면 세션 쿠키 삭제');
    await ctx.close();
  }

  // 7. 로그인 전 데이터는 처음 승인된 계정으로 옮겨와요
  {
    const { ctx, page } = await context();
    await page.goto(BASE + '/robots.txt');
    await page.evaluate(() => localStorage.setItem('online-interviewer:v2', JSON.stringify({ version: 2, profile: { name: '예전사용자' }, applications: [{ id: 'l1', company: '예전회사', docs: [], interviews: [] }] })));
    const mover = await makeUser(`mover-${stamp}@example.com`, '박민수', 'approved');
    await ctx.addCookies([await sessionCookie(mover)]);
    await page.goto(BASE + '/app');
    await page.waitForSelector('aside >> text=예전회사');
    const keys = await page.evaluate(() => Object.keys(localStorage));
    ok(!keys.includes('online-interviewer:v2') && keys.includes(`online-interviewer:v2:${mover}`), '로그인 전 데이터를 계정으로 옮기고 예전 키 삭제', keys.join(','));
    await ctx.close();
  }

  // 8. 회원 탈퇴: 오래된 세션은 다시 로그인 요구, 새 세션은 바로 탈퇴
  {
    const quitter = await makeUser(`quit-${stamp}@example.com`, '최하늘', 'approved');
    const before = errors.length;
    const old = await context(await sessionCookie(quitter, '2 days'));
    await old.page.goto(BASE + '/settings');
    old.page.once('dialog', (d) => d.accept());
    await old.page.click('button:has-text("회원 탈퇴")');
    await old.page.waitForSelector('text=다시 로그인해야 탈퇴할 수 있어요');
    ok(true, '로그인한 지 하루 넘은 세션은 다시 로그인 요구');
    // 이 단계의 400(다시 로그인 필요) 응답은 의도한 것이라 오류 목록에서 빼요.
    errors.splice(before, errors.length - before, ...errors.slice(before).filter((e) => !/status of 400/.test(e)));
    await old.ctx.close();
    const fresh = await context(await sessionCookie(quitter));
    await fresh.page.goto(BASE + '/settings');
    await shot(fresh.page, '08-settings-account');
    fresh.page.once('dialog', (d) => d.accept());
    await fresh.page.click('button:has-text("회원 탈퇴")');
    await fresh.page.waitForURL(/\/login\?deleted=1/);
    await fresh.page.waitForSelector('text=계정을 지웠어요');
    const n = (await db.query('select count(*) n from "user" where id=$1', [quitter])).rows[0].n;
    ok(n === '0', '탈퇴하면 DB에서 회원 삭제', n);
    await fresh.ctx.close();
  }

  // 9. 승인 대기 중 신청 취소, 관리자 거절
  {
    const p1 = await makeUser(`cancel-${stamp}@example.com`, '정다은', 'pending');
    const c = await context(await sessionCookie(p1));
    await c.page.goto(BASE + '/app');
    c.page.once('dialog', (d) => d.accept());
    await c.page.click('button:has-text("신청 취소")');
    await c.page.waitForURL(/\/login\?deleted=1/);
    const n = (await db.query('select count(*) n from "user" where id=$1', [p1])).rows[0].n;
    ok(n === '0', '승인 대기 중 신청 취소 → 회원 삭제', n);
    await c.ctx.close();

    const p2 = await makeUser(`reject-${stamp}@example.com`, '한결', 'pending');
    const admin = await context(await sessionCookie(await makeUser(ADMIN, '하은', 'approved')));
    await admin.page.goto(BASE + '/admin');
    admin.page.once('dialog', (d) => d.accept());
    await admin.page.locator('li', { hasText: `reject-${stamp}` }).locator('button:has-text("거절")').click();
    await admin.page.waitForFunction((e) => !document.body.innerText.includes(e), `reject-${stamp}`);
    const n2 = (await db.query('select count(*) n from "user" where id=$1', [p2])).rows[0].n;
    ok(n2 === '0', '거절하면 신청 기록 삭제', n2);
    await shot(admin.page, '09-admin-after');
    const member = await context(await sessionCookie(userId));
    await member.page.goto(BASE + '/admin');
    ok((await member.page.locator('text=페이지를 찾을 수 없').count()) > 0 || (await member.page.title()).includes('404') || (await member.page.locator('text=404').count()) > 0, '일반 회원은 /admin 404');
    await member.ctx.close();
    await admin.ctx.close();
  }

  // 10. 모바일 화면 넘침
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    for (const path of ['/', '/login', '/pricing']) {
      await page.goto(BASE + path);
      const sw = await page.evaluate(() => document.documentElement.scrollWidth);
      ok(sw <= 390, `모바일 가로 넘침 없음 ${path}`, sw);
    }
    await page.goto(BASE + '/login');
    await page.screenshot({ path: `${OUT}/10-login-mobile.png` });
    await ctx.close();
  }

  ok(errors.length === 0, '브라우저 오류 없음', JSON.stringify(errors.slice(0, 5)));
  await browser.close();
  await db.end();
  console.log(fails ? `${fails}개 실패` : '모두 통과');
  process.exit(fails ? 1 : 0);
})().catch((e) => {
  console.error('ERR', e);
  process.exit(1);
});
