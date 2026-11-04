import { expect, test, type Page } from '@playwright/test';
import { createCareer, type CareerSave } from '../src/engine/career';
import { advanceRound } from '../src/engine/season';
import { chooseEvent } from '../src/engine/events';
import { SCHOOLS } from '../src/engine/schools';
function highlight(role: 'HITTER' | 'PITCHER') {
  let save = createCareer({ name: '브라우저 신인', role, teamId: 'lg', hand: 'RIGHT' }, 42);
  while (save.phase !== 'HIGHLIGHT_READY') save = save.pendingEvent ? chooseEvent(save, save.pendingEvent, 0) : advanceRound(save);
  return save;
}
async function installSave(page: Page, save: CareerSave) {
  await page.goto('./'); await expect(page.getByRole('button', { name: '나의 커리어 시작하기 →' })).toBeVisible();
  await page.evaluate(async value => {
    await new Promise<void>((resolve, reject) => {
      const open = indexedDB.open('diamond-road', 1);
      open.onupgradeneeded = () => open.result.createObjectStore('saves');
      open.onsuccess = () => { const db = open.result; const tx = db.transaction('saves', 'readwrite'); tx.objectStore('saves').put(value, 'active'); tx.oncomplete = () => { db.close(); resolve(); }; tx.onerror = () => reject(tx.error); };
    });
  }, save);
  await page.reload();
  await expect(page).toHaveURL(new RegExp('/' + (save.phase === 'SEASON_RESULT' ? 'season-result' : save.phase === 'RETIRED' ? 'legacy' : ['HIGHLIGHT_READY', 'MINI_GAME'].includes(save.phase) ? 'game' : 'career') + '/$'));
}
async function readSave(page: Page): Promise<CareerSave> {
  return page.evaluate(async () => new Promise((resolve, reject) => {
    const open = indexedDB.open('diamond-road', 1);
    open.onsuccess = () => { const db = open.result; const tx = db.transaction('saves'); const request = tx.objectStore('saves').get('active'); tx.oncomplete = () => { db.close(); resolve(request.result); }; tx.onerror = () => reject(tx.error); };
  }));
}
test('360px에서 생성·훈련·진행·새로고침 복구 및 레이아웃', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('./');
  await page.getByRole('textbox', { name: '선수 이름' }).fill('나의 신인');
  await page.getByRole('button', { name: '나의 커리어 시작하기 →' }).click();
  await expect(page.getByRole('heading', { name: /나의 신인/ })).toBeVisible();
  await page.getByRole('button', { name: '컨택 +2' }).click();
  await expect(page.getByText('훈련 완료.', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: '다음 라운드', exact: true }).click();
  await expect(page.getByText(/2026년 · 1 \/ 14 /)).toBeVisible();
  await page.reload();
  await expect(page.getByText(/2026년 · 1 \/ 14 /)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
  await page.screenshot({ path: 'test-results/mobile-career.png', fullPage: true });
  expect(errors).toEqual([]);
});
test('타자 중요 상황을 복구하고 한 타석을 직접 완료한다', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  const initial = highlight('HITTER'); await installSave(page, initial);
  await page.getByRole('button', { name: '직접 플레이', exact: true }).click();
  await expect(page.locator('canvas')).toBeVisible();
  await page.reload(); await expect(page.locator('canvas')).toBeVisible();
  const start = page.getByRole('button', { name: '다음 공 시작 (Space)', exact: true });
  const commit = page.getByRole('button', { name: '결과 반영 · 경기로 돌아가기' });
  for (let i = 0; i < 20 && !await commit.isVisible(); i++) {
    await start.click();
    await expect(start.or(commit)).toBeVisible({ timeout: 4000 });
  }
  await commit.click(); await expect(page.getByText(/직접 승부 결과:/)).toBeVisible();
  await expect(page).toHaveURL(/\/career\/$/);
  const result = await readSave(page);
  expect(result.league.hitters.user.pa).toBe(initial.league.hitters.user.pa + 1);
  await page.getByRole('button', { name: '다음 라운드', exact: true }).click();
  await expect(page.getByRole('button', { name: '다음 라운드', exact: true })).toBeEnabled();
  expect((await readSave(page)).league.round).toBe(initial.league.round + 1);
  expect(errors).toEqual([]);
});
test('투수는 구종·9분할 목표·제구 게이지로 타석을 완료한다', async ({ page }) => {
  const initial = highlight('PITCHER'); await installSave(page, initial);
  await page.getByRole('button', { name: '직접 플레이', exact: true }).click();
  await expect(page.locator('canvas')).toBeVisible();
  await page.getByRole('combobox', { name: /구종/ }).selectOption('SLIDER');
  await page.getByRole('button', { name: '목표 구역 1', exact: true }).click();
  const commit = page.getByRole('button', { name: '결과 반영 · 경기로 돌아가기' });
  for (let i = 0; i < 20 && !await commit.isVisible(); i++) {
    await page.getByRole('button', { name: '투구 준비 (Space)', exact: true }).click();
    await page.getByRole('button', { name: '제구 게이지 멈추기 (Space)', exact: true }).click();
    await expect(page.getByRole('button', { name: '투구 준비 (Space)', exact: true }).or(commit)).toBeVisible();
  }
  await commit.click(); await expect(page.getByText(/직접 승부 결과:/)).toBeVisible();
  await expect(page).toHaveURL(/\/career\/$/);
  const result = await readSave(page);
  const sum = (s: CareerSave) => Object.values(s.league.hitters).reduce((n, h) => n + h.pa, 0);
  expect(sum(result)).toBe(sum(initial) + 1);
});
test('시즌 종료·이적·다음 시즌을 실제 화면에서 저장한다', async ({ page }) => {
  let save = createCareer({ name: '계약 신인', role: 'HITTER', teamId: 'lg', hand: 'RIGHT' }, 7);
  while (save.phase !== 'SEASON_RESULT') save = advanceRound(save, { interactive: false, autoChoices: true });
  await installSave(page, save);
  await expect(page.getByText(/포스트시즌 우승/)).toBeVisible();
  await page.locator('.offer').nth(1).click();
  await expect(page.locator('.offer')).toHaveCount(0);
  await page.getByRole('button', { name: '성장 반영 · 다음 시즌 →' }).click();
  await expect(page.getByText(/2027년 · 0 \/ 144/)).toBeVisible();
  await expect(page).toHaveURL(/\/career\/$/);
  await page.reload(); await expect(page.getByText(/2027년 · 0 \/ 144/)).toBeVisible();
  expect((await readSave(page)).player.teamId).not.toBe('lg');
});
test('키보드만으로 생성·훈련·시즌 진행을 조작한다', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('textbox', { name: '선수 이름' }).focus();
  await page.keyboard.type('Keyboard');
  const create = page.getByRole('button', { name: '나의 커리어 시작하기 →' });
  await create.focus(); await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/career\/$/);
  const train = page.getByRole('button', { name: '컨택 +2' });
  await train.focus(); await page.keyboard.press('Enter'); await expect(train).toBeDisabled();
  const next = page.getByRole('button', { name: '다음 라운드', exact: true });
  await expect(next).toBeEnabled();
  await next.focus(); await expect(next).toBeFocused(); await page.keyboard.press('Enter');
  await expect(page.getByText(/2026년 · 1 \/ 14 /)).toBeVisible();
});
test('35세 조기 은퇴를 선택하면 명예의 전당에 기록을 보존한다', async ({ page }) => {
  let save = createCareer({ name: '은퇴 선수', role: 'PITCHER', teamId: 'lg', hand: 'RIGHT' }, 4);
  save.player.age = 35;
  while (save.phase !== 'SEASON_RESULT') save = advanceRound(save, { interactive: false, autoChoices: true });
  await installSave(page, save);
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: '이번 시즌을 끝으로 은퇴' }).click();
  await expect(page).toHaveURL(/\/legacy\/$/);
  await expect(page.getByText('HALL OF FAME', { exact: true })).toBeVisible();
  await expect(page.getByText(/최고의 시즌/)).toBeVisible();
  const retired = await readSave(page);
  expect(retired.phase).toBe('RETIRED'); expect(retired.seasons).toHaveLength(1);
});
test('실제 고교를 골라 16세부터 3학년·드래프트·KBO 입단까지 화면으로 플레이한다', async ({ page }) => {
  test.setTimeout(120000);
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./');
  await page.getByRole('textbox', { name: '선수 이름' }).fill('고교부터');
  await page.getByRole('searchbox', { name: '학교·클럽 검색' }).fill('경남고');
  await page.getByRole('button', { name: /경남고.*고교 야구부/ }).click();
  await expect(page.getByRole('group', { name: '학교·U18 클럽 선택' }).getByRole('button')).toHaveCount(1);
  await expect(page.locator('select[name=team] option')).toHaveCount(10);
  await page.getByRole('button', { name: '장타자의 꿈', exact: false }).click();
  await page.getByRole('button', { name: '나의 커리어 시작하기 →' }).click();
  await expect(page).toHaveURL(/\/career\/$/);
  await expect(page.getByRole('heading', { name: /고교부터/ })).toContainText('16세');
  expect((await readSave(page)).player.teamId).toBe(SCHOOLS.find(s => s.name === '경남고')!.id);
  for (let grade = 1; grade <= 3; grade++) {
    const checkbox = page.getByRole('checkbox', { name: '중요 상황에서 직접 플레이' });
    await checkbox.uncheck();
    let turns = 0;
    while ((await readSave(page)).phase !== 'SEASON_RESULT' && turns++ < 10) {
      const saved = await readSave(page);
      if (saved.pendingEvent) {
        const card = page.locator('.notice').filter({ has: page.getByText('CAREER EVENT', { exact: true }) });
        await card.getByRole('button').first().click();
        await expect(card).toHaveCount(0);
      } else {
        await page.getByRole('button', { name: '시즌 끝까지 자동 진행', exact: true }).click();
        const eventCard = page.locator('.notice').filter({ has: page.getByText('CAREER EVENT', { exact: true }) });
        await expect(eventCard.or(page.getByRole('button', { name: /다음 학년으로|신인 드래프트 참가/ }))).toBeVisible({ timeout: 30000 });
      }
    }
    await expect(page).toHaveURL(/\/season-result\/$/);
    await expect(page.getByText('이번 학년, 이만큼 자랐습니다.')).toBeVisible();
    await expect(page.getByText('고교 전국대회 결과', { exact: true })).toBeVisible();
    await page.screenshot({ path: `artifacts/playtest/school-year-${grade}.png`, fullPage: true });
    expect((await readSave(page)).youth?.history).toHaveLength(grade);
    if (grade < 3) { await page.getByRole('button', { name: '다음 학년으로 →' }).click(); await expect(page).toHaveURL(/\/career\/$/); }
  }
  await page.getByRole('button', { name: '신인 드래프트 참가 →' }).click();
  await expect(page).toHaveURL(/\/draft\/$/);
  await page.screenshot({ path: 'test-results/youth-draft-mobile.png', fullPage: true });
  await page.getByRole('button', { name: /프로 입단 계약|육성선수로 도전/ }).click();
  await expect(page).toHaveURL(/\/career\/$/);
  await expect(page.getByRole('heading', { name: /고교부터/ })).toContainText('19세');
  const pro = await readSave(page); expect(pro.youth?.graduated).toBe(true); expect(pro.league.standings).toHaveLength(10); expect(pro.youth?.history).toHaveLength(3);
  await page.reload(); await expect(page.getByText(/2029년 · 0 \/ 144/)).toBeVisible();
  expect(errors).toEqual([]);
});
