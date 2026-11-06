import {expect, test} from '@playwright/test';
import {createCareer} from '../src/engine/career';
import {SCHOOLS} from '../src/engine/schools';
import {retire} from '../src/engine/season';
import {installSave, readSave} from './helpers';

for (const width of [320, 390, 1440]) {
  test(`${width}px: 긴 이름과 계약 이력에서도 홈·상점·기록·은퇴 취소를 사용할 수 있다`, async ({page}) => {
    await page.setViewportSize({width, height: width === 320 ? 740 : 900});
    const save = createCareer({name: '아주긴이름의야구선수', role: 'HITTER', teamId: 'lg', hand: 'RIGHT', style: 3, focus: 'eye'}, 25);
    save.life!.meeting = {year: save.year, answered: true};
    save.life!.cash = 100000000;
    save.league.hitters.user.h = 9;
    save.league.hitters.user.ab = 30;
    save.league.hitters.user.pa = 35;
    save.league.hitters.user.g = 8;
    save.seasons = [{year: 2025, age: 18, teamId: 'lg', rank: 2, ovr: 49,
      hitter: {...save.league.hitters.user, h: 100, ab: 400, pa: 450, g: 120}, pitcher: null}];
    save.contractHistory = Array.from({length: 25}, (_, i) => ({...save.contractHistory[0], year: 2001 + i}));
    await installSave(page, save, true);
    const nav = page.getByRole('navigation', {name: '커리어 메뉴'});
    await expect(page.locator('.careerHome .homeStats')).toContainText('0.300');
    await expect(page.locator('.homeSeasonBrief')).toContainText('출루형');
    await expect(page.locator('.homeSeasonBrief')).toContainText('선구안');
    await expect(page.getByRole('button', {name: '시즌 준비하기 →'})).toBeInViewport();
    const noOverflow = async () => expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await noOverflow();
    await page.screenshot({path: `artifacts/usability-home-${width}.png`, fullPage: true});
    await page.getByRole('button', {name: '시즌 준비하기 →'}).click();
    const shop = page.getByRole('region', {name: '시즌 아이템 상점'});
    await expect(shop).toBeVisible();
    await shop.getByRole('button', {name: /구매/}).first().click();
    await expect.poll(async () => (await readSave(page)).shop?.history.length).toBe(1);
    await noOverflow();
    await nav.getByRole('button', {name: '기록', exact: true}).click();
    await page.getByRole('button', {name: '커리어', exact: true}).click();
    await page.getByText('완료 시즌 · 통산 기록 (1시즌)', {exact: true}).click();
    await expect(page.getByText(/2025 · 18세/)).toBeVisible();
    await page.getByText('계약 이력', {exact: true}).click();
    await noOverflow();
    await nav.getByRole('button', {name: '선수', exact: true}).click();
    await page.getByText('커리어 관리', {exact: true}).click();
    await page.getByRole('button', {name: '은퇴하기', exact: true}).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('button', {name: '계속 플레이', exact: true}).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect((await readSave(page)).phase).toBe('PRESEASON');
  });
}

test('학생 중도 은퇴도 확정 성적과 학생 때의 스타일 전환을 회고에 남긴다', async ({page}) => {
  await page.setViewportSize({width: 320, height: 740});
  const save = createCareer({name: '학생의 마지막 경기', role: 'HITTER', schoolId: SCHOOLS[0].id, teamId: 'lg', hand: 'RIGHT'}, 11);
  save.phase = 'SIMULATING'; save.league.round = 3;
  Object.assign(save.league.hitters.user, {g: 3, ab: 10, pa: 12, h: 4});
  save.life!.styleHistory = [{year: save.year, round: 2, from: 0, to: 3}];
  await installSave(page, retire(save));
  await page.getByRole('button', {name: '통산 기록', exact: true}).click();
  await expect(page.getByRole('heading', {name: '학생 야구 통산'})).toBeVisible();
  await expect(page.getByText('고교·대학 별도 합산 기록 (중도 은퇴 시 확정 경기 포함)', {exact: true})).toBeVisible();
  await page.getByRole('button', {name: '연대기', exact: true}).click();
  await expect(page.getByText('시즌 중 은퇴 · 확정된 경기까지의 기록', {exact: true})).toBeVisible();
  await expect(page.getByText('전환점 · 교타형 → 출루형', {exact: true})).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  await page.screenshot({path: 'artifacts/student-retirement-mobile.png', fullPage: true});
});
