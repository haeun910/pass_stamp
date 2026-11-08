const { chromium } = require('playwright');
const S = process.argv[2] || 'e2e-shots'; require('fs').mkdirSync(S + '/shots', { recursive: true });
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1400, height: 950 }, colorScheme: process.env.DARK ? 'dark' : 'light' });
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write']);
  const p = await ctx.newPage(); p.setDefaultTimeout(8000);
  const errors = [];
  p.on('console', m => { if (m.type() === 'error') errors.push(m.text() + ' @ ' + (m.location().url || '')); });
  p.on('pageerror', e => errors.push('PAGEERROR ' + e.message));
  const shot = async n => p.screenshot({ path: `${S}/shots/${n}.png`, fullPage: true });
  const step = async (name, fn) => { try { await fn(); console.log('OK', name); } catch (e) { console.log('FAIL', name, e.message.split('\n')[0]); await shot('fail-' + name); } };

  const BASE = process.env.BASE_URL || 'http://localhost:3000';
  await step('landing', async () => {
    await p.goto(BASE + '/'); await p.waitForTimeout(600);
    await shot('00-landing');
    await p.goto(BASE + '/pricing'); await p.waitForTimeout(300);
    await shot('00b-pricing');
    await p.setViewportSize({ width: 390, height: 844 });
    await p.goto(BASE + '/'); await p.waitForTimeout(400);
    await shot('00c-landing-mobile');
    const sw = await p.evaluate(() => document.documentElement.scrollWidth);
    if (sw > 390) throw new Error('landing mobile overflow ' + sw);
    await p.setViewportSize({ width: 1400, height: 950 });
    await p.click('header >> text=시작하기');
    await p.waitForURL(/\/app$/);
  });
  await p.goto(BASE + '/app');
  // 테스트 서버는 APP_ACCESS_CODE=e2e-code로 띄워요. 브라우저에 코드를 넣어 두고 시작해요.
  await p.evaluate(() => localStorage.setItem('online-interviewer:access-code', 'e2e-code'));
  await p.reload(); await p.waitForTimeout(500);
  await shot('01-home-empty');
  await step('profile import', async () => {
    await p.click('text=내 프로필');
    await p.fill('textarea[placeholder^="또는 이력서"]', '홍길동 이력서 ... ');
    await p.click('text=붙여넣은 글로 정리하기');
    await p.waitForSelector('text=이렇게 정리했어요');
    await p.click('text=기존 내용에 더하기');
    await shot('02-profile');
  });
  await step('sensitive number warning', async () => {
    await p.fill('textarea >> nth=2', '학력 메모 900101-1234567');
    await p.waitForSelector('text=주민등록번호로 보이는 번호가 있어요');
    await p.fill('textarea >> nth=2', '한국대학교 컴퓨터공학과 (2018~2024)');
    await p.waitForTimeout(300);
    if ((await p.locator('text=주민등록번호로 보이는').count()) > 0) throw new Error('warning stuck');
  });
  await step('new app', async () => {
    await p.click('aside >> text=홈');
    await p.click('main button:has-text("새 지원 회사")');
    await p.waitForURL(/apply/);
    await p.fill('input[placeholder="예: 토스"]', '토스');
    await p.fill('input[placeholder="예: 프론트엔드 개발자"]', '프론트엔드 개발자');
    await p.click('text=회사 조사 시작');
    await p.waitForSelector('button:has-text("서류 쓰러 가기") >> visible=true', { timeout: 15000 });
    await shot('03-research');
  });
  await step('docs write', async () => {
    await p.click('button:has-text("서류 쓰러 가기") >> visible=true');
    await p.click('button:has-text("자기소개서")');
    await p.click('text=자기소개서 쓰기');
    await p.waitForSelector('text=문항별 글자 수', { timeout: 15000 });
    await p.waitForTimeout(800);
    await shot('04-docs');
  });
  await step('revise free', async () => {
    await p.fill('input[placeholder="어떻게 고칠까요?"]', '더 간결하게');
    await p.click('button:has-text("고쳐쓰기")');
    await p.waitForSelector('text=수정 내역', { timeout: 15000 });
    await p.click('text=이전과 비교');
    await p.waitForTimeout(400);
    await shot('04b-diff');
    await p.click('text=비교 닫기');
  });
  await step('revise error keeps original', async () => {
    const before = await p.innerText('main');
    await p.route('**/api/agent', r => r.fulfill({
      status: 200, contentType: 'application/x-ndjson',
      body: '{"type":"text","text":"반쯤 쓴 글"}\n{"type":"error","text":"테스트 오류예요"}\n',
    }));
    await p.fill('input[placeholder="어떻게 고칠까요?"]', '오류 테스트');
    await p.click('button:has-text("고쳐쓰기")');
    await p.waitForSelector('text=테스트 오류예요');
    await p.waitForTimeout(300);
    const after = await p.innerText('main');
    await p.unroute('**/api/agent');
    if (after.includes('반쯤 쓴 글')) throw new Error('partial text left in document');
    const marker = before.split('\n').find(l => l.includes('(모의 응답)'));
    if (!marker) throw new Error('no original content marker');
    if (!after.includes(marker)) throw new Error('original content changed');
  });
  await step('evaluate', async () => {
    await p.click('button:has-text("기준으로 채점받기") >> visible=true');
    await p.waitForURL(/tab=evaluate/);
    await p.click('button:text-is("채점받기") >> visible=true');
    await p.waitForSelector('text=종합 점수', { timeout: 15000 });
    await p.waitForTimeout(800);
    await shot('05-evaluate');
  });
  await step('revise from eval', async () => {
    await p.click('text=피드백 반영해 수정본 만들기');
    await p.waitForTimeout(3000);
    await shot('06-revised');
    const t = await p.innerText('main');
    if (!t.includes('마지막 저장: 피드백 반영')) throw new Error('no 피드백 반영 version');
  });
  await step('interview', async () => {
    await p.click('nav >> text=면접 연습');
    await p.click('text=면접 시작');
    await p.waitForSelector('text=1분 동안 자기소개', { timeout: 15000 });
    await p.fill('textarea[placeholder^="답변을"]', '안녕하세요 저는 프론트엔드 개발자 홍길동입니다.');
    await p.click('text=답변 제출');
    await p.waitForSelector('text=잘 들었습니다', { timeout: 15000 });
    await p.click('text=면접 종료하고 피드백 받기');
    await p.waitForSelector('text=종합 점수: 68', { timeout: 15000 });
    await p.waitForTimeout(600);
    await shot('07-interview');
  });
  await step('questions', async () => {
    await p.click('button:has-text("예상 질문")');
    await p.click('text=예상 질문 뽑기');
    await p.waitForSelector('text=질문 의도', { timeout: 15000 });
  });
  await step('overview', async () => {
    await p.click('nav >> text=개요');
    await p.waitForTimeout(500);
    await shot('08-overview');
  });
  await step('home', async () => {
    await p.click('aside >> text=홈');
    await p.waitForTimeout(500);
    await shot('09-home');
  });
  await step('print', async () => {
    const [pp] = await Promise.all([ctx.waitForEvent('page'), (async () => {
      await p.goBack(); await p.waitForTimeout(300);
      await p.goto(p.url().split('?')[0] + '?tab=docs'); await p.waitForTimeout(500);
      await p.click('text=내보내기'); await p.click('text=PDF로 저장 / 인쇄');
    })()]);
    await pp.waitForLoadState(); await pp.waitForTimeout(500);
    await pp.screenshot({ path: `${S}/shots/10-print.png` });
  });
  await step('reload persist', async () => {
    await p.reload(); await p.waitForTimeout(800);
    const t = await p.textContent('body');
    if (!t.includes('토스')) throw new Error('lost data');
  });
  await step('start from previous doc', async () => {
    await p.goto(BASE + '/app'); await p.waitForTimeout(400);
    await p.click('text=새 지원 회사'); await p.waitForURL(/tab=research/);
    await p.goto(p.url().split('?')[0] + '?tab=docs'); await p.waitForTimeout(500);
    await shot('11-docs-start-from');
    await p.locator('button', { hasText: '토스' }).filter({ hasText: '자기소개서' }).first().click();
    await p.waitForSelector('text=토스 서류에서 복사');
    const v = await p.inputValue('textarea >> nth=0').catch(() => '');
    const t = await p.textContent('body');
    if (!t.includes('지원 동기') && !v.includes('지원 동기')) throw new Error('copied content missing');
  });
  await step('copy per question', async () => {
    await p.click('button:has-text("1번 복사")');
    await p.waitForSelector('text=복사했어요');
    const clip = await p.evaluate(() => navigator.clipboard.readText());
    if (!clip.trim()) throw new Error('clipboard empty');
    if (/^#+\s/m.test(clip)) throw new Error('clipboard still has markdown heading');
    await shot('12-copy-per-question');
  });
  await step('demo preview', async () => {
    await p.goto(BASE + '/app?demo=1');
    await p.waitForURL(/\/apply\/demo-hanbitpay\?tab=overview/);
    await p.waitForSelector('h1:has-text("한빛페이")');
    const t = await p.textContent('body');
    if (!t.includes('예시')) throw new Error('demo badge missing');
    await shot('13-demo-overview');
    for (const [tab, mustHave, name] of [['research', '한눈에 보기', '13b-demo-research'], ['docs', '피드백 반영', '13c-demo-docs'], ['evaluate', '86', '13d-demo-evaluate'], ['interview', '74점', '13e-demo-interview']]) {
      await p.click(`nav >> text=${{ research: '회사 리서치', docs: '서류 작성', evaluate: '회사 기준 채점', interview: '면접 연습' }[tab]}`);
      await p.waitForTimeout(500);
      const body = await p.textContent('body');
      if (!body.includes(mustHave)) throw new Error(`demo ${tab} missing "${mustHave}"`);
      await shot(name);
    }
    // 지난 면접을 열면 리포트가 먼저 보이고, 대화는 접혀 있어요.
    await p.click('button:has-text("74점") >> visible=true');
    // 다른 탭 패널은 hidden으로 숨겨져 있어서, 보이는 요소만 찾아요.
    await p.waitForSelector('text=종합 점수 >> visible=true');
    await shot('13e2-demo-interview-report');
    await p.click('button:has-text("펼치기") >> visible=true');
    await p.waitForSelector('text=면접을 마치겠습니다 >> visible=true');
    // 두 번 들어가도 예시는 하나만 있어야 해요.
    await p.goto(BASE + '/app?demo=1'); await p.waitForURL(/demo-hanbitpay/);
    await p.goto(BASE + '/app'); await p.waitForTimeout(500);
    const n = await p.locator('main h3:has-text("한빛페이")').count();
    if (n !== 1) throw new Error('demo count ' + n);
    await shot('13f-home-with-demo');
  });
  await step('not found and seo files', async () => {
    const r = await p.goto(BASE + '/no-such-page');
    if (r.status() !== 404) throw new Error('status ' + r.status());
    await p.waitForSelector('text=이런 주소의 페이지가 없어요');
    await shot('14-not-found');
    for (const [path, type, must] of [['/robots.txt', 'text/plain', 'Disallow: /app'], ['/sitemap.xml', 'xml', '/pricing'], ['/opengraph-image', 'image/png', null]]) {
      const res = await p.request.get(BASE + path);
      const ct = res.headers()['content-type'] || '';
      if (!res.ok() || !ct.includes(type)) throw new Error(`${path} ${res.status()} ${ct}`);
      if (must && !(await res.text()).includes(must)) throw new Error(`${path} missing ${must}`);
    }
    await p.goto(BASE + '/app'); await p.waitForTimeout(300);
  });
  await step('broken data recovery', async () => {
    await p.evaluate(() => localStorage.setItem('online-interviewer:v2', JSON.stringify({ version: 2, profile: null, applications: [{ company: '깨진데이터', docs: 'x' }] })));
    await p.goto(BASE + '/app'); await p.waitForTimeout(800);
    const t = await p.innerText('main');
    if (!t.includes('깨진데이터')) throw new Error('broken app not shown');
    await p.click('main >> text=깨진데이터'); await p.waitForURL(/apply/);
    await p.goto(p.url().split('?')[0] + '?tab=docs'); await p.waitForTimeout(500);
    const t2 = await p.innerText('main');
    if (!t2.includes('서류')) throw new Error('docs tab broken');
  });
  await step('access code brute force limit', async () => {
    // 서버에 APP_ACCESS_CODE가 있을 때만 의미 있어요. 테스트 서버는 코드를 'e2e-code'로 띄워요.
    let last = 0;
    for (let i = 0; i < 25; i++) {
      const r = await p.request.post(BASE + '/api/agent', { headers: { 'x-access-code': 'wrong' + i }, data: { agent: 'writer' } });
      last = r.status();
    }
    if (last !== 429) throw new Error('expected 429 after repeated wrong codes, got ' + last);
    const ok = await p.request.post(BASE + '/api/agent', { headers: { 'x-access-code': 'e2e-code' }, data: { agent: 'writer', context: { company: 'x' } } });
    if (ok.status() !== 200) throw new Error('correct code rejected ' + ok.status());
  });
  await step('security headers and icon', async () => {
    const r = await p.request.get(BASE + '/');
    const h = r.headers();
    if (h['x-frame-options'] !== 'DENY' || h['x-content-type-options'] !== 'nosniff') throw new Error('missing headers ' + JSON.stringify(h));
    const i = await p.request.get(BASE + '/icon.png');
    if (i.status() !== 200) throw new Error('icon ' + i.status());
  });
  await step('mobile', async () => {
    await p.setViewportSize({ width: 390, height: 844 });
    await p.goto(p.url().split('?')[0] + '?tab=docs'); await p.waitForTimeout(600);
    await shot('11-mobile');
    const sw = await p.evaluate(() => document.documentElement.scrollWidth);
    console.log('mobile scrollWidth', sw);
  });
  console.log('ERRORS', JSON.stringify(errors.slice(0, 10)));
  await b.close();
})();
