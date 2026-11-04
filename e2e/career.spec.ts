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
  await expect(page).toHaveURL(/\/career\/$/);
  await page.getByRole('button', { name: /시즌 준비하기|시즌 결산과 다음 진로|나의 커리어 돌아보기/ }).click();
}
async function readSave(page: Page): Promise<CareerSave> {
  return page.evaluate(async () => new Promise((resolve, reject) => {
    const open = indexedDB.open('diamond-road', 1);
    open.onsuccess = () => { const db = open.result; const tx = db.transaction('saves'); const request = tx.objectStore('saves').get('active'); tx.oncomplete = () => { db.close(); resolve(request.result); }; tx.onerror = () => reject(tx.error); };
  }));
}
test('FA 자격 후 이적·다음 시즌을 실제 화면에서 저장한다', async ({ page }) => {
  let save = createCareer({ name: '계약 신인', role: 'HITTER', teamId: 'lg', hand: 'RIGHT' }, 7);
  save.contractService = { days: 1160, faUses: 0, lastFADays: 0, activeRounds: 0 };
  while (save.phase !== 'SEASON_RESULT') save = advanceRound(save, { interactive: false, autoChoices: true });
  await installSave(page, save);
  await expect(page.getByRole('region', { name: '시즌 성장 결산' })).toBeVisible();
  await page.locator('.offer').nth(1).click();
  await expect(page.locator('.offer')).toHaveCount(0);
  await page.getByRole('button', { name: '성장 반영 · 다음 시즌 →' }).click();
  await expect(page.getByText(/2027년 · 0 \/ 144/)).toBeVisible();
  await expect(page).toHaveURL(/\/career\/$/);
  await page.reload(); await page.getByRole('button', { name: '시즌 준비하기 →' }).click(); await expect(page.getByText(/2027년 · 0 \/ 144/)).toBeVisible();
  expect((await readSave(page)).player.teamId).not.toBe('lg');
});
test('FA 전 연봉 협상과 자동 잔류 재계약을 저장한다', async ({ page }) => {
  let save = createCareer({ name: '잔류 선수', role: 'HITTER', teamId: 'lg', hand: 'RIGHT' }, 9);
  while (save.phase !== 'SEASON_RESULT') save = advanceRound(save, { interactive: false, events: false });
  await installSave(page, save);
  await expect(page.getByRole('heading', { name: '소속 구단과 연봉 재계약' })).toBeVisible();
  await expect(page.locator('.offer')).toHaveCount(1);
  await page.getByRole('button', { name: /재계약 연봉 협상/ }).click();
  await expect(page.getByRole('button', { name: /재계약 연봉 협상/ })).toBeDisabled();
  const negotiated = (await readSave(page)).contractOffers[0].salaryCR;
  expect(negotiated).toBeGreaterThan(save.contractOffers[0].salaryCR);
  await page.getByRole('button', { name: '성장 반영 · 다음 시즌 →' }).click();
  await expect(page.getByText('2027년 · 0 / 144', { exact: false })).toBeVisible();
  const next = await readSave(page);
  await expect(page.getByRole('button', { name: '시즌 전체 자동 진행 →' })).toBeDisabled();
  expect(next.player.teamId).toBe('lg'); expect(next.player.salaryCR).toBe(negotiated);
  expect(next.contractHistory.at(-1)?.kind).toBe('RENEWAL');
  await page.reload(); await expect(page.getByRole('button', { name: '시즌 준비하기 →' })).toBeVisible();
  expect((await readSave(page)).player.salaryCR).toBe(negotiated);
});
test('35세 조기 은퇴를 선택하면 명예의 전당에 기록을 보존한다', async ({ page }) => {
  let save = createCareer({ name: '은퇴 선수', role: 'PITCHER', teamId: 'lg', hand: 'RIGHT' }, 4);
  save.player.age = 35;
  while (save.phase !== 'SEASON_RESULT') save = advanceRound(save, { interactive: false, autoChoices: true });
  await installSave(page, save);
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: '이번 시즌을 끝으로 은퇴' }).click();
  await expect(page).toHaveURL(/\/career\/$/);
  await expect(page.getByText('HALL OF FAME', { exact: true })).toBeVisible();
  await expect(page.getByText(/최고의 시즌/)).toBeVisible();
  await page.getByRole('navigation').getByRole('button', { name: '기록', exact: true }).click();
  await expect(page.getByText(/완료 시즌 · 통산 기록/)).toBeVisible();
  const retired = await readSave(page);
  expect(retired.phase).toBe('RETIRED'); expect(retired.seasons).toHaveLength(1);
});
test('고교 3년과 드래프트를 자동 시즌으로 완주한다', async ({ page }) => {
  test.setTimeout(120000);
  await page.goto('./');
  await page.getByRole('textbox', { name: '선수 이름' }).fill('고교부터');
  await page.getByRole('button', { name: '나의 커리어 시작하기 →' }).click();
  await page.getByRole('button', { name: '시즌 준비하기 →' }).click();
  for (let grade = 1; grade <= 3; grade++) {
    await expect(page.getByRole('button', { name: '시즌 전체 자동 진행 →' })).toBeDisabled();
    await page.getByRole('button', { name: '컨택 +2', exact: true }).click();
    await page.getByRole('button', { name: '시즌 전체 자동 진행 →' }).click();
    const next = page.getByRole('button', { name: grade === 3 ? '신인 드래프트 참가 →' : '다음 학년으로 →' });
    await expect(next).toBeVisible({ timeout: 60000 });
    expect((await readSave(page)).youth?.history).toHaveLength(grade);
    await next.click();
  }
  await page.getByRole('button', { name: /프로 입단 계약|육성선수로 도전/ }).click();
  const pro = await readSave(page);
  expect(pro.player.age).toBe(19); expect(pro.youth?.graduated).toBe(true);
  expect(pro.league.standings).toHaveLength(10);
});
