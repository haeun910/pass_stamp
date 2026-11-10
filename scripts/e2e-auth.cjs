// 로그인·승인 흐름 자동 테스트(이메일·비밀번호). 가입·로그인·비밀번호 변경은 실제 화면으로 하고,
// 그 밖의 준비(여러 회원 만들기)는 DB에 직접 넣어 서명한 세션 쿠키를 써요(scripts/e2e-session.cjs).
//
// 준비: 로그인 설정(DATABASE_URL, BETTER_AUTH_SECRET, BETTER_AUTH_URL=http://localhost:3100,
//       ADMIN_EMAIL, ADMIN_PASSWORD, AGENT_MOCK=1)로 npm run build && npx next start -p 3100
// 실행: 같은 환경 변수로 node scripts/e2e-auth.cjs [캡처 폴더]
// 가입·로그인 횟수 제한에 걸리지 않게 실행마다 다른 x-forwarded-for(테스트용 주소)를 붙여요.
const { chromium } = require('playwright');
const fs = require('fs');
const { connect } = require('./e2e-session.cjs');

const BASE = process.env.BASE_URL || 'http://localhost:3100';
const ADMIN = process.env.ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const OUT = process.argv[2] || 'e2e-auth-shots';
fs.mkdirSync(OUT, { recursive: true });
let fails = 0;
const ok = (cond, name, extra = '') => {
  console.log(cond ? 'OK  ' : 'FAIL', name, extra);
  if (!cond) fails++;
};
// 문서용 주소 대역(198.51.100.0/24)에서 실행마다 다른 값을 골라요.
const fakeIp = () => `198.51.100.${1 + Math.floor(Math.random() * 250)}`;

(async () => {
  if (!ADMIN_PASSWORD) throw new Error('ADMIN_PASSWORD가 필요해요 (테스트 서버와 같은 값).');
  const { db, makeUser, adminId, sessionCookie } = await connect();
  const stamp = Date.now();
  const runIp = fakeIp();

  const browser = await chromium.launch();
  const errors = [];
  // 일부러 만든 401·403·404 응답의 콘솔 기록은 오류로 세지 않아요. 틀린 비밀번호를 시험하는 동안에는 4xx 전체를 빼요.
  const NORMAL = /status of 40[134]/;
  let allowStatus = NORMAL;
  async function context({ cookie, ip = runIp, viewport = { width: 1360, height: 900 } } = {}) {
    const ctx = await browser.newContext({ viewport, extraHTTPHeaders: { 'x-forwarded-for': ip } });
    if (cookie) await ctx.addCookies([cookie]);
    const page = await ctx.newPage();
    page.setDefaultTimeout(10000);
    page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
    page.on('console', (m) => {
      if (m.type() === 'error' && !allowStatus.test(m.text())) errors.push(m.text());
    });
    return { ctx, page };
  }
  const shot = (page, name) => page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
  const field = (page, label) => page.getByLabel(label, { exact: true });
  async function login(page, email, password) {
    await page.goto(BASE + '/login');
    await field(page, '이메일').fill(email);
    await field(page, '비밀번호').fill(password);
    await page.click('form button[type="submit"]');
  }

  // 1. 로그인 전
  {
    const { ctx, page } = await context();
    await page.goto(BASE + '/');
    await shot(page, '01-landing');
    ok((await page.locator('header >> text=로그인').count()) === 1, '랜딩 헤더에 로그인 링크');
    ok((await page.locator('#beta').count()) === 1 && (await page.locator('#pricing').count()) === 0, '베타 동안 요금제 대신 베타 안내');
    await page.goto(BASE + '/app');
    ok(/\/login\?next=%2Fapp$/.test(page.url()), '로그인 없이 /app → 로그인 화면', page.url());
    await shot(page, '02-login');
    ok((await field(page, '이메일').count()) === 1 && (await field(page, '비밀번호').count()) === 1, '로그인 화면은 이메일·비밀번호만');
    ok((await page.locator('text=/Google|카카오/').count()) === 0, '소셜 로그인 문구 없음');
    await page.goto(BASE + '/privacy');
    ok((await page.locator('text=/Google 또는 카카오|프로필 사진/').count()) === 0, '개인정보처리방침에 소셜 로그인 문구 없음');
    await page.goto(BASE + '/terms');
    ok((await page.locator('text=이메일 주소, 비밀번호를 입력해 가입').count()) === 1, '약관이 이메일 가입 기준');
    await page.goto(BASE + '/app?demo=1');
    await page.waitForSelector('text=로그인 없이 예시를 보고 있어요');
    ok(page.url().includes('/apply/demo-hanbitpay'), '미리보기는 로그인 없이 예시로', page.url());
    const r = await page.request.post(BASE + '/api/agent', { data: { agent: 'writer', context: { company: 'x' } } });
    ok(r.status() === 401, '로그인 없이 AI 요청 → 401', r.status());
    await ctx.close();
  }

  // 2. 가입 화면: 확인 실패, 관리자 이메일 사칭, 정상 가입
  const userEmail = `user-${stamp}@example.com`;
  const userPw = 'first-pass-123';
  let userId;
  {
    const { ctx, page } = await context();
    await page.goto(BASE + '/signup');
    await field(page, '이름').fill('김지원');
    await field(page, '이메일').fill(userEmail);
    await field(page, '비밀번호').fill(userPw);
    await field(page, '비밀번호 확인').fill(userPw + 'x');
    await page.check('input[type="checkbox"]');
    await page.click('form button[type="submit"]');
    await page.waitForSelector('text=비밀번호 확인이 맞지 않아요');
    ok(true, '비밀번호 확인이 다르면 막음');
    await field(page, '비밀번호 확인').fill(userPw);
    await page.uncheck('input[type="checkbox"]');
    await page.click('form button[type="submit"]');
    await page.waitForSelector('text=이용약관과 개인정보처리방침에 동의해 주세요');
    ok(true, '약관 동의 없으면 막음');
    await page.check('input[type="checkbox"]');
    await field(page, '이메일').fill(ADMIN.toUpperCase());
    allowStatus = /status of 4\d\d/;
    await page.click('form button[type="submit"]');
    // 관리자 계정은 빌드 때 이미 만들어져 있어서 보통 "이미 가입한 이메일"로 막혀요. 없을 때는 서버 훅이 막아요.
    await page.waitForSelector('text=/이 이메일로는 가입할 수 없어요|이미 가입한 이메일이에요/');
    allowStatus = NORMAL;
    const admins = (await db.query('select count(*) n from "user" where lower(email) = lower($1)', [ADMIN])).rows[0].n;
    ok(admins === '1', '관리자 이메일로는 가입 불가(대소문자 무관)', admins);
    await field(page, '이메일').fill(userEmail);
    await shot(page, '03-signup');
    await page.click('form button[type="submit"]');
    await page.waitForSelector('text=이용 신청이 접수됐어요');
    ok(page.url().endsWith('/app'), '가입하면 바로 로그인되고 승인 대기 화면', page.url());
    await shot(page, '04-waiting');
    const row = (await db.query('select id, status, "emailVerified" from "user" where email=$1', [userEmail])).rows[0];
    userId = row?.id;
    ok(row?.status === 'pending' && row?.emailVerified === false, '새 회원은 pending, emailVerified=false', JSON.stringify(row));
    const pw = (await db.query(`select password from account where "userId"=$1 and "providerId"='credential'`, [userId])).rows[0]?.password;
    ok(Boolean(pw) && !pw.includes(userPw), '비밀번호는 해시로 저장');
    const r = await page.request.post(BASE + '/api/agent', { data: { agent: 'writer', context: { company: 'x' } } });
    ok(r.status() === 403 && (await r.json()).error.includes('승인'), '승인 대기 AI 요청 → 403', r.status());
    ok((await page.request.get(BASE + '/api/admin/users')).status() === 403, '승인 대기는 관리 API 불가');
    await page.goto(BASE + '/login');
    ok(page.url().endsWith('/app'), '로그인 상태에서 /login → /app', page.url());
    await ctx.close();

    // 같은 이메일로 다시 가입, 틀린 비밀번호
    const again = await context();
    await again.page.goto(BASE + '/signup');
    await field(again.page, '이름').fill('김지원');
    await field(again.page, '이메일').fill(userEmail);
    await field(again.page, '비밀번호').fill(userPw);
    await field(again.page, '비밀번호 확인').fill(userPw);
    await again.page.check('input[type="checkbox"]');
    allowStatus = /status of 4\d\d/;
    await again.page.click('form button[type="submit"]');
    await again.page.waitForSelector('text=이미 가입한 이메일이에요');
    ok(true, '이미 가입한 이메일 안내');
    await login(again.page, userEmail, 'wrong-password-9');
    await again.page.waitForSelector('text=이메일이나 비밀번호가 맞지 않아요');
    ok(true, '틀린 비밀번호 안내');
    allowStatus = NORMAL;
    await again.ctx.close();
  }

  // 3. 관리자가 화면으로 로그인해 수락
  const admin = await context();
  {
    await login(admin.page, ADMIN, ADMIN_PASSWORD);
    await admin.page.waitForSelector('nav >> text=가입 신청 관리');
    ok(true, '관리자 로그인 → 관리 메뉴');
    await admin.page.goto(BASE + '/admin');
    await admin.page.waitForSelector(`text=${userEmail}`);
    await shot(admin.page, '05-admin-pending');
    const csrf = await admin.page.request.post(BASE + '/api/admin/users', { headers: { origin: 'http://evil.example' }, data: { action: 'approve', userId } });
    ok(csrf.status() === 403, '다른 사이트에서 보낸 관리 요청 차단', csrf.status());
    const self = await admin.page.request.post(BASE + '/api/admin/users', { data: { action: 'block', userId: await adminId() } });
    ok(self.status() === 400, '관리자 계정은 중지 불가', self.status());
    await admin.page.locator('li', { hasText: userEmail }).locator('button:has-text("수락")').click();
    await admin.page.waitForSelector(`section:has-text("이용 중") >> text=${userEmail}`);
    const st = (await db.query('select status from "user" where id=$1', [userId])).rows[0].status;
    ok(st === 'approved', '수락하면 approved', st);
  }

  // 4. 승인된 사용자: 앱, AI, 계정별 저장, 마감 달력
  {
    const { ctx, page } = await context();
    await login(page, userEmail, userPw);
    await page.waitForSelector('text=지원 현황');
    ok(true, '승인 뒤 로그인하면 앱 진입');
    const r2 = await page.request.post(BASE + '/api/agent', { data: { agent: 'writer', instruction: '테스트', context: { company: 'x' } } });
    ok(r2.status() === 200, '승인 뒤 AI 요청(모의 응답) 200', r2.status());
    await page.click('main button:has-text("새 지원 회사")');
    await page.waitForURL(/apply/);
    await page.fill('input[placeholder="예: 토스"]', '계정분리테스트');
    await page.waitForTimeout(800);
    const keys = await page.evaluate(() => Object.keys(localStorage));
    ok(keys.includes(`online-interviewer:v2:${userId}`) && !keys.includes('online-interviewer:v2'), '계정별 저장 키 사용', keys.join(','));

    // 마감 달력: 이번 달·다음 달 마감, 제출한 지원, 날짜 없는 지원
    const now = new Date();
    const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const soon = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2);
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 15);
    const mk = (id, company, deadline, status = '준비 중') => ({ id, company, role: '백엔드', deadline, status, docs: [], interviews: [], createdAt: 1, updatedAt: 1 });
    const seed = (p, apps) =>
      p.evaluate(([key, list]) => localStorage.setItem(key, JSON.stringify({ version: 2, profile: { name: '김지원' }, applications: list })), [`online-interviewer:v2:${userId}`, apps]);
    await seed(page, [mk('c1', '마감임박회사', ymd(soon)), mk('c2', '다음달회사', ymd(nextMonth)), mk('c3', '제출한회사', ymd(soon), '서류 제출'), mk('c4', '날짜없는회사', '')]);
    await page.goto(BASE + '/app');
    await page.click('button:has-text("마감 달력")');
    await page.waitForSelector('#deadline-calendar-title');
    const title = await page.textContent('#deadline-calendar-title');
    ok(title.includes(`${now.getFullYear()}년 ${now.getMonth() + 1}월`), '달력은 이번 달부터', title);
    const soonThisMonth = soon.getMonth() === now.getMonth();
    if (soonThisMonth) {
      ok((await page.locator('table a:has-text("마감임박회사")').count()) === 1, '이번 달 칸에 마감 회사 표시');
      ok((await page.locator('section ul a:has-text("마감임박회사") >> text=D-2').count()) === 1, '목록에 D-day 표시');
      ok((await page.locator('section ul a:has-text("제출한회사") >> text=제출').count()) >= 1, '제출한 지원은 제출로 표시');
    } else {
      console.log('SKIP 이번 달 칸 확인(이틀 뒤가 다음 달이라)');
    }
    ok((await page.locator('main >> text=날짜없는회사').count()) === 0, '마감일 없는 지원은 달력에 없음');
    await shot(page, '06-calendar');
    await page.click('button[aria-label="다음 달"]');
    await page.waitForSelector(`#deadline-calendar-title:has-text("${nextMonth.getMonth() + 1}월")`);
    ok((await page.locator('table a:has-text("다음달회사")').count()) === 1, '다음 달로 넘기면 다음 달 마감 표시');
    await page.click('button:has-text("오늘")');
    await page.waitForSelector(`#deadline-calendar-title:has-text("${now.getMonth() + 1}월")`);
    await page.reload();
    await page.waitForSelector('#deadline-calendar-title');
    ok(true, '보기 방식(달력)을 기억');
    await page.click('button[aria-label="다음 달"]');
    await page.locator('table a', { hasText: '다음달회사' }).first().click();
    await page.waitForURL(/\/apply\/c2/);
    ok(true, '달력에서 회사를 누르면 지원 화면으로');
    // 휴대폰 너비
    const mobile = await context({ cookie: await sessionCookie(userId), viewport: { width: 390, height: 844 } });
    await mobile.page.goto(BASE + '/app');
    await seed(mobile.page, [mk('c1', '마감임박회사', ymd(soon)), mk('c2', '다음달회사', ymd(nextMonth))]);
    await mobile.page.evaluate(() => localStorage.setItem('online-interviewer:home-view', 'calendar'));
    await mobile.page.reload();
    await mobile.page.waitForSelector('#deadline-calendar-title');
    const sw = await mobile.page.evaluate(() => document.documentElement.scrollWidth);
    ok(sw <= 390, '휴대폰 너비에서 달력 가로 넘침 없음', sw);
    await mobile.page.screenshot({ path: `${OUT}/07-calendar-mobile.png`, fullPage: true });
    await mobile.ctx.close();

    // 5. 임시 비밀번호: 관리자가 발급 → 기존 로그인 끊김 → 임시 비밀번호로 로그인 → 새 비밀번호로 변경
    admin.page.once('dialog', (d) => d.accept());
    await admin.page.locator('li', { hasText: userEmail }).locator('button:has-text("임시 비밀번호")').click();
    await admin.page.waitForSelector('text=임시 비밀번호예요');
    const temp = (await admin.page.locator('code').first().textContent())?.trim();
    ok(Boolean(temp) && temp.length === 12, '임시 비밀번호 12자 발급', temp?.length);
    const r3 = await page.request.post(BASE + '/api/agent', { data: { agent: 'writer', context: { company: 'x' } } });
    ok(r3.status() === 401, '임시 비밀번호를 발급하면 기존 로그인 끊김', r3.status());
    allowStatus = /status of 4\d\d/;
    await login(page, userEmail, userPw);
    await page.waitForSelector('text=이메일이나 비밀번호가 맞지 않아요');
    ok(true, '이전 비밀번호로는 로그인 불가');
    await login(page, userEmail, temp);
    await page.waitForSelector('text=지원 현황');
    ok(true, '임시 비밀번호로 로그인');
    await page.goto(BASE + '/settings');
    const newPw = 'second-pass-456';
    await field(page, '지금 비밀번호').fill('not-the-temp-1');
    await field(page, '새 비밀번호 (8자 이상)').fill(newPw);
    await field(page, '새 비밀번호 확인').fill(newPw);
    await page.click('button:has-text("비밀번호 바꾸기")');
    await page.waitForSelector('text=지금 비밀번호가 맞지 않아요');
    ok(true, '지금 비밀번호가 틀리면 변경 불가');
    await field(page, '지금 비밀번호').fill(temp);
    await page.click('button:has-text("비밀번호 바꾸기")');
    await page.waitForSelector('text=비밀번호를 바꿨어요');
    ok(true, '설정에서 새 비밀번호로 변경');
    await shot(page, '08-settings');
    const fresh = await context();
    await login(fresh.page, userEmail, temp);
    await fresh.page.waitForSelector('text=이메일이나 비밀번호가 맞지 않아요');
    ok(true, '바꾼 뒤에는 임시 비밀번호로 로그인 불가');
    await login(fresh.page, userEmail, newPw);
    await fresh.page.waitForSelector('text=지원 현황');
    ok(true, '새 비밀번호로 로그인');
    allowStatus = NORMAL;
    await fresh.ctx.close();

    // 6. 이용 중지 → 로그아웃되고 로그인도 막힘 → 다시 허용
    admin.page.once('dialog', (d) => d.accept());
    await admin.page.locator('li', { hasText: userEmail }).locator('button:has-text("이용 중지")').click();
    await admin.page.waitForSelector(`section:has-text("이용 중지") >> text=${userEmail}`);
    const sessions = (await db.query('select count(*) n from session where "userId"=$1', [userId])).rows[0].n;
    ok(sessions === '0', '중지하면 세션 삭제', sessions);
    const r4 = await page.request.post(BASE + '/api/agent', { data: { agent: 'writer', context: { company: 'x' } } });
    ok(r4.status() === 401, '중지된 사용자 AI 요청 → 401', r4.status());
    allowStatus = /status of 4\d\d/;
    await login(page, userEmail, newPw);
    await page.waitForSelector('text=이용이 중지된 계정이에요');
    ok(true, '중지된 계정은 로그인 불가 안내');
    allowStatus = NORMAL;
    await admin.page.locator('li', { hasText: userEmail }).locator('button:has-text("다시 허용")').click();
    await admin.page.waitForSelector(`section:has-text("이용 중") >> text=${userEmail}`);
    await login(page, userEmail, newPw);
    await page.waitForSelector('text=지원 현황');
    ok(true, '다시 허용하면 로그인 가능');
    await ctx.close();
  }

  // 7. 다른 계정은 같은 브라우저에서 앞 계정의 데이터를 못 봐요 + 로그아웃하며 지우기
  {
    const { ctx, page } = await context({ cookie: await sessionCookie(userId) });
    await page.goto(BASE + '/app');
    await page.waitForSelector('text=지원 현황');
    const other = await makeUser(`other-${stamp}@example.com`, '이서연', 'approved');
    await page.evaluate((uid) => localStorage.setItem(`online-interviewer:v2:${uid}`, JSON.stringify({ version: 2, profile: {}, applications: [{ id: 'a1', company: '앞계정회사', docs: [], interviews: [] }] })), userId);
    await ctx.clearCookies();
    await ctx.addCookies([await sessionCookie(other)]);
    await page.goto(BASE + '/app');
    await page.waitForSelector('text=지원 현황');
    ok((await page.locator('text=앞계정회사').count()) === 0, '다른 계정의 서류는 보이지 않음');
    await page.evaluate((uid) => localStorage.setItem(`online-interviewer:v2:${uid}`, JSON.stringify({ version: 2, profile: {}, applications: [{ id: 'b1', company: '지울회사', docs: [], interviews: [] }] })), other);
    await page.reload();
    await page.waitForSelector('aside >> text=지울회사');
    await page.click('aside button[aria-label="로그아웃"]');
    await page.check('aside input[type="checkbox"]');
    await page.click('aside button:has-text("로그아웃") >> nth=-1');
    await page.waitForURL(BASE + '/');
    const left = await page.evaluate((uid) => localStorage.getItem(`online-interviewer:v2:${uid}`), other);
    ok(left === null, '로그아웃하며 이 기기 데이터 지움');
    const cookies = await ctx.cookies();
    ok(!cookies.some((c) => c.name.includes('session_token') && c.value), '로그아웃하면 세션 쿠키 삭제');
    await ctx.close();
  }

  // 8. 로그인 전 데이터는 처음 승인된 계정으로 옮겨와요
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

  // 9. 회원 탈퇴(비밀번호 확인), 승인 대기 중 신청 취소, 관리자 거절
  {
    const quitter = await makeUser(`quit-${stamp}@example.com`, '최하늘', 'approved', 'quit-pass-789');
    const q = await context({ cookie: await sessionCookie(quitter, '2 days') });
    await q.page.goto(BASE + '/settings');
    await q.page.click('button:has-text("회원 탈퇴")');
    await field(q.page, '비밀번호 확인').fill('wrong-pass-000');
    allowStatus = /status of 4\d\d/;
    await q.page.click('form button[type="submit"]:has-text("회원 탈퇴")');
    await q.page.waitForSelector('text=비밀번호가 맞지 않아요');
    ok(true, '탈퇴할 때 비밀번호가 틀리면 막음');
    allowStatus = NORMAL;
    await field(q.page, '비밀번호 확인').fill('quit-pass-789');
    await q.page.click('form button[type="submit"]:has-text("회원 탈퇴")');
    await q.page.waitForURL(/\/login\?deleted=1/);
    await q.page.waitForSelector('text=계정을 지웠어요');
    const n = (await db.query('select count(*) n from "user" where id=$1', [quitter])).rows[0].n;
    ok(n === '0', '탈퇴하면 DB에서 회원 삭제(로그인한 지 오래된 세션도 비밀번호로 확인)', n);
    await q.ctx.close();

    const p1 = await makeUser(`cancel-${stamp}@example.com`, '정다은', 'pending', 'cancel-pass-1');
    const c = await context({ cookie: await sessionCookie(p1) });
    await c.page.goto(BASE + '/app');
    await c.page.click('button:has-text("신청 취소")');
    await field(c.page, '비밀번호 확인').fill('cancel-pass-1');
    await c.page.click('form button[type="submit"]:has-text("신청 취소")');
    await c.page.waitForURL(/\/login\?deleted=1/);
    const n1 = (await db.query('select count(*) n from "user" where id=$1', [p1])).rows[0].n;
    ok(n1 === '0', '승인 대기 중 신청 취소 → 회원 삭제', n1);
    await c.ctx.close();

    const p2 = await makeUser(`reject-${stamp}@example.com`, '한결', 'pending');
    await admin.page.goto(BASE + '/admin');
    admin.page.once('dialog', (d) => d.accept());
    await admin.page.locator('li', { hasText: `reject-${stamp}` }).locator('button:has-text("거절")').click();
    await admin.page.waitForFunction((e) => !document.body.innerText.includes(e), `reject-${stamp}`);
    const n2 = (await db.query('select count(*) n from "user" where id=$1', [p2])).rows[0].n;
    ok(n2 === '0', '거절하면 신청 기록 삭제', n2);
    await shot(admin.page, '09-admin-after');
    const member = await context({ cookie: await sessionCookie(userId) });
    await member.page.goto(BASE + '/admin');
    ok((await member.page.locator('text=/페이지를 찾을 수 없|404/').count()) > 0, '일반 회원은 /admin 404');
    await member.ctx.close();
    await admin.ctx.close();
  }

  // 10. 로그인 시도 횟수 제한(같은 주소에서 5분에 10번)
  {
    const ip = fakeIp();
    let last = 0;
    for (let i = 0; i < 11; i++) {
      const r = await fetch(BASE + '/api/auth/sign-in/email', {
        method: 'POST',
        headers: { 'content-type': 'application/json', origin: BASE, 'x-forwarded-for': ip },
        body: JSON.stringify({ email: `nobody-${stamp}@example.com`, password: 'wrong-password-1' }),
      });
      last = r.status;
    }
    ok(last === 429, '로그인 시도가 많으면 429', last);
  }

  // 11. 모바일 화면 넘침
  {
    const { ctx, page } = await context({ viewport: { width: 390, height: 844 } });
    for (const path of ['/', '/login', '/signup', '/pricing']) {
      await page.goto(BASE + path);
      const sw = await page.evaluate(() => document.documentElement.scrollWidth);
      ok(sw <= 390, `모바일 가로 넘침 없음 ${path}`, sw);
    }
    await page.goto(BASE + '/signup');
    await page.screenshot({ path: `${OUT}/10-signup-mobile.png` });
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
