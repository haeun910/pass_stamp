const { chromium } = require('playwright');
const S = process.argv[2] || 'e2e-shots'; require('fs').mkdirSync(S + '/shots', { recursive: true });
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1400, height: 950 } });
  const p = await ctx.newPage(); p.setDefaultTimeout(8000);
  const errors = [];
  p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  p.on('pageerror', e => errors.push('PAGEERROR ' + e.message));
  const shot = async n => p.screenshot({ path: `${S}/shots/${n}.png`, fullPage: true });
  const step = async (name, fn) => { try { await fn(); console.log('OK', name); } catch (e) { console.log('FAIL', name, e.message.split('\n')[0]); await shot('fail-' + name); } };

  await p.goto('' + (process.env.BASE_URL || 'http://localhost:3000') + '/');
  await shot('01-home-empty');
  await step('profile import', async () => {
    await p.click('text=내 프로필');
    await p.fill('textarea[placeholder^="또는 기존"]', '홍길동 이력서 ... ');
    await p.click('text=붙여넣은 글로 정리하기');
    await p.waitForSelector('text=이렇게 정리했어요');
    await p.click('text=기존 내용에 더하기');
    await shot('02-profile');
  });
  await step('new app', async () => {
    await p.click('text=홈');
    await p.click('text=+ 새 지원 회사');
    await p.waitForURL(/apply/);
    await p.fill('input[placeholder="예: 토스"]', '토스');
    await p.fill('input[placeholder="예: 프론트엔드 개발자"]', '프론트엔드 개발자');
    await p.click('text=회사 조사 시작');
    await p.waitForSelector('text=다음: 서류 작성 →', { timeout: 15000 });
    await shot('03-research');
  });
  await step('docs write', async () => {
    await p.click('text=다음: 서류 작성 →');
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
  await step('evaluate', async () => {
    await p.click('button:has-text("기준으로 평가받기"), button:has-text("다시 평가받기")');
    await p.click('button:has-text("평가 받기")');
    await p.waitForSelector('text=종합 점수', { timeout: 15000 });
    await p.waitForTimeout(800);
    await shot('05-evaluate');
  });
  await step('revise from eval', async () => {
    await p.click('text=피드백 반영해 수정본 만들기');
    await p.waitForTimeout(3000);
    await shot('06-revised');
    const v = await p.textContent('body');
    if (!v.includes('평가 반영')) throw new Error('no 평가 반영 version');
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
