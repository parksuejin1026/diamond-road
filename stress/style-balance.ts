import {afterAll, expect, it} from 'vitest';
import {mkdirSync, writeFileSync} from 'node:fs';
import {createCareer} from '../src/engine/career';
import {advanceRound, nextSeason} from '../src/engine/season';
import {signDraft} from '../src/engine/youth';
import {SCHOOLS} from '../src/engine/schools';
import {resolveDecisions} from '../src/tests/resolve-decisions';
import {playStyle} from '../src/engine/playStyles';
import {careerSummary} from '../src/engine/careerSummary';
import {buyShopItem, shopState, SHOP_ITEMS} from '../src/engine/shop';

// Paired seeds and identical choices isolate the initial style as far as this
// simulation allows. Decline style/focus proposals throughout each sample.
export function registerStyleSamples(role: 'HITTER'|'PITCHER', style: number) {
const cases = [11, 29, 47].map(seed => ({role, style, seed}));
const results: object[] = [];
it.each(cases)('$role style $style seed $seed: full career', ({role, style, seed}) => {
  let save = createCareer({name: 'Style sample', role, style, hand: 'RIGHT', teamId: 'lg', schoolId: SCHOOLS[0].id}, seed);
  let steps = 0;
  while (save.phase !== 'RETIRED' && steps++ < 5000) {
    save = resolveDecisions(save);
    if (save.phase === 'DRAFT') save = signDraft(save);
    else if (save.phase === 'SEASON_RESULT') {
      save = nextSeason(save);
    }
    else {
      if (save.phase === 'PRESEASON') {
        const stock = shopState(save).stock.map(id => SHOP_ITEMS.find(item => item.id === id)!)
          .sort((a, b) => b.price - a.price || a.id.localeCompare(b.id));
        for (const item of stock) {
          const next = buyShopItem(save, item.id);
          if (next !== save) { save = next; break; }
        }
      }
      save = advanceRound(save, {interactive: false, events: true});
    }
  }
  expect(save.phase).toBe('RETIRED');
  expect(save.player.age).toBe(38);
  expect(save.seasons).toHaveLength(20);
  expect(save.youth?.history).toHaveLength(3);
  expect(new Set(save.seasons.map(row => row.year)).size).toBe(20);
  expect(new Set(save.contractSettlements?.map(row => row.year)).size).toBe(save.contractSettlements?.length);
  expect(save.life!.style).toBe(style);
  for (const player of save.players) for (const value of Object.values(player.skills)) {
    expect(value).toBeGreaterThanOrEqual(1); expect(value).toBeLessThanOrEqual(99);
  }
  const summary = careerSummary(save);
  const result = {role, style, name: playStyle(role, style).name, seed, steps,
    peak: summary.peak, mvp: summary.mvp, championships: summary.championships,
    hitter: summary.hitter, pitcher: summary.pitcher, hitterRates: summary.hitterRates,
    pitcherRates: summary.pitcherRates, seasons: save.seasons};
  results.push(result);
  console.log('STYLE_SAMPLE', JSON.stringify({role, style, seed, peak: result.peak, mvp: result.mvp}));
}, 300000);

afterAll(() => {
  mkdirSync('artifacts', {recursive: true});
  writeFileSync(`artifacts/style-balance-${role}-${style}.json`, JSON.stringify({
    expected: cases.length, completed: results.length,
    policy: 'Seeds 11/29/47; same school; keep style/focus; first contract; highest affordable shop item; tournaments accepted; no injected skills or awards.',
    results,
  }, null, 2));
});

}
