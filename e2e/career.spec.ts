import {installSave,readSave,dismissDecisions,enterSeason,runSeason} from './helpers';
import {resolveDecisions} from '../src/tests/resolve-decisions';
import { expect, test, type Page } from '@playwright/test';
import { createCareer, type CareerSave } from '../src/engine/career';
import { advanceRound } from '../src/engine/season';
import { chooseEvent } from '../src/engine/events';
import { SCHOOLS } from '../src/engine/schools';
import { simulateAsianGames } from '../src/engine/asianGames';
function highlight(role: 'HITTER' | 'PITCHER') {
  let save = createCareer({ name: '브라우저 신인', role, teamId: 'lg', hand: 'RIGHT' }, 42);
  while (save.phase !== 'HIGHLIGHT_READY') save = save.pendingEvent ? chooseEvent(save, save.pendingEvent, 0) : advanceRound(save);
  return save;
}
test('FA 자격 후 이적·다음 시즌을 실제 화면에서 저장한다', async ({ page }) => {
  let save = createCareer({ name: '계약 신인', role: 'HITTER', teamId: 'lg', hand: 'RIGHT' }, 7);
  save.contractService = { days: 1160, faUses: 0, lastFADays: 0, activeRounds: 0 };
  while (save.phase !== 'SEASON_RESULT') save = advanceRound(save, { interactive: false, autoChoices: true });
  await installSave(page, save);
  await expect(page.locator('.decisionCard')).toBeVisible();
  await page.locator('.offer').nth(1).click();
  await expect(page.locator('.offer')).toHaveCount(0);
  await enterSeason(page);
  if((await readSave(page)).contractOffers.length){await page.locator('.offer').first().click();await enterSeason(page);}
  await page.getByRole('button', { name: '성장 반영 · 다음 시즌 →' }).click();
  await dismissDecisions(page);
  await expect(page.getByText(/2027년 · 0 \/ 144/)).toBeVisible();
  await expect(page).toHaveURL(/\/career\/$/);
  await page.reload(); await page.getByRole('button', { name: '시즌 준비하기 →' }).click(); await expect(page.getByText(/2027년 · 0 \/ 144/)).toBeVisible();
  expect((await readSave(page)).player.teamId).not.toBe('lg');
});
test('FA 전 연봉 협상과 직접 선택한 잔류 재계약을 저장한다', async ({ page }) => {
  let save = createCareer({ name: '잔류 선수', role: 'HITTER', teamId: 'lg', hand: 'RIGHT' }, 9);
  while (save.phase !== 'SEASON_RESULT') save = advanceRound(save, { interactive: false, events: false });
  await installSave(page, save);
  expect((await readSave(page)).asianGames).toHaveLength(1);
  await expect(page.getByRole('heading', { name: '소속 구단과 연봉 재계약' })).toBeVisible();
  await expect(page.locator('.offer')).toHaveCount(1);
  await page.getByRole('button', { name: /재계약 연봉 협상/ }).click();
  await expect(page.getByRole('button', { name: /재계약 연봉 협상/ })).toBeDisabled();
  const negotiated = (await readSave(page)).contractOffers[0].salaryCR;
  expect(negotiated).toBeGreaterThan(save.contractOffers[0].salaryCR);
  if((await readSave(page)).contractOffers.length){await page.locator('.offer').first().click();await enterSeason(page);}
  await page.getByRole('button', { name: '성장 반영 · 다음 시즌 →' }).click();
  await dismissDecisions(page);
  await expect(page.getByText('2027년 · 0 / 144', { exact: false })).toBeVisible();
  const next = await readSave(page);
  await expect(page.getByRole('button', { name: /시즌 (전체|이어서) 자동 진행 →/ })).toBeEnabled();
  expect(next.player.teamId).toBe('lg'); expect(next.player.salaryCR).toBe(negotiated);
  expect(next.contractHistory.at(-1)?.kind).toBe('RENEWAL');
  await page.reload(); await expect(page.getByRole('button', { name: '시즌 준비하기 →' })).toBeVisible();
  expect((await readSave(page)).player.salaryCR).toBe(negotiated);
});
for (const role of ['HITTER', 'PITCHER'] as const) test(`${role} 대표팀 대회 결과와 별도 기록을 복원한다`, async ({ page }) => {
  const save = createCareer({ name: '국가대표', role, teamId: 'lg', hand: 'RIGHT' }, 12);
  save.year = 2030; save.phase = 'SEASON_RESULT'; save.player.age = 22; save.player.rosterStatus = 'STARTER';
  for (const key of Object.keys(save.player.skills)) save.player.skills[key] = 99;
  const report = simulateAsianGames(save)!; expect(report.selected).toBe(true);
  await page.setViewportSize({ width: 390, height: 844 });
  await installSave(page, save);
  await page.getByRole('button', { name: '대회', exact: true }).click();
  await expect(page.getByRole('region', { name: '아시안게임 결과' })).toBeVisible();
  await page.getByText('나의 대표팀 성적 · KBO 기록과 별도', { exact: true }).click();
  await page.screenshot({ path: `artifacts/asian-games-${role}.png` });
  await page.getByRole('navigation').getByRole('button', { name: '기록', exact: true }).click();
  await page.getByRole('button', { name: '대표팀', exact: true }).click();
  await page.getByText('국가대표 · 아시안게임 기록 (1회 선발)', { exact: true }).click();
  await page.reload();
  const restored = await readSave(page);
  expect(restored.asianGames).toEqual(save.asianGames);
  expect(restored.player.reputation).toBe(save.player.reputation);
  expect(restored.league).toEqual(save.league);
});
test('35세 조기 은퇴를 선택하면 명예의 전당에 기록을 보존한다', async ({ page }) => {
  let save = createCareer({ name: '은퇴 선수', role: 'PITCHER', teamId: 'lg', hand: 'RIGHT' }, 4);
  save.player.age = 35;
  while (save.phase !== 'SEASON_RESULT') save = advanceRound(save, { interactive: false, autoChoices: true });
  await installSave(page, resolveDecisions(save));
  await page.getByRole('button', { name: '이번 시즌을 끝으로 은퇴' }).click();
  await page.getByRole('dialog').getByRole('button',{name:'은퇴 확정 · 커리어 정리'}).click();
  await expect(page).toHaveURL(/\/legacy\/$/);
  await expect(page.getByText('HALL OF FAME', { exact: true })).toBeVisible();
  await expect(page.getByText(/최고의 시즌/)).toBeVisible();
  await page.getByRole('button',{name:'통산 기록',exact:true}).click();
  await expect(page.getByText(/완료 시즌 · 통산 기록/)).toBeVisible();
  const retired = await readSave(page);
  expect(retired.phase).toBe('RETIRED'); expect(retired.seasons).toHaveLength(1);
});
test('고교 3년과 드래프트를 자동 시즌으로 완주한다', async ({ page }) => {
  test.setTimeout(120000);
  await page.goto('./');
  await page.getByRole('textbox', { name: '선수 이름' }).fill('고교부터');
  await page.getByRole('button', { name: '다음 단계 →' }).click();
  await page.getByRole('button', { name: '다음 단계 →' }).click();
  await page.getByRole('button', { name: '나의 커리어 시작하기 →' }).click();
  await dismissDecisions(page);
  await page.getByRole('button', { name: '시즌 준비하기 →' }).click();
  for (let grade = 1; grade <= 3; grade++) {
    await expect(page.getByRole('button', { name: /시즌 (전체|이어서) 자동 진행 →/ })).toBeEnabled();
    await runSeason(page);
    const next = page.getByRole('button', { name: grade === 3 ? '신인 드래프트 참가 →' : '다음 학년으로 →' });
    await expect(next).toBeVisible({ timeout: 60000 });
    expect((await readSave(page)).youth?.history).toHaveLength(grade);
    await next.click();
    await dismissDecisions(page);
  }
  await page.getByRole('button', { name: /프로 입단 계약|육성선수로 도전/ }).click();
  await page.getByRole('button',{name:'조건 확인 · 입단 계약 체결'}).click();
  await expect.poll(async()=>(await readSave(page)).phase).toBe('PRESEASON');
  const pro = await readSave(page);
  expect(pro.player.age).toBe(19); expect(pro.youth?.graduated).toBe(true);
  expect(pro.league.standings).toHaveLength(10);
});
