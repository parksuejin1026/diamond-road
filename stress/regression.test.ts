import { expect, it } from 'vitest';
import { createCareer } from '../src/engine/career';
import { advanceRound, nextSeason, resolveHighlight, pendingPaId } from '../src/engine/season';
import { chooseEvent } from '../src/engine/events';
import { signContract, resolveTrade } from '../src/engine/contracts';
import { SCHOOLS } from '../src/engine/schools';
import { isYouth, signDraft } from '../src/engine/youth';
it('100개 커리어의 첫 시즌: 중단·복구·직접 결과·이벤트·720경기·포스트시즌', () => {
  for (let seed = 0; seed < 100; seed++) {
    let save = createCareer({ name: '회귀 ' + seed, role: seed % 2 ? 'HITTER' : 'PITCHER', teamId: 'lg', hand: 'RIGHT' }, seed);
    let steps = 0;
    while (!['SEASON_RESULT', 'RETIRED'].includes(save.phase) && steps++ < 200) {
      if (save.pendingEvent) save = chooseEvent(save, save.pendingEvent, seed % 2);
      else if (save.phase === 'HIGHLIGHT_READY') save = resolveHighlight(JSON.parse(JSON.stringify(save)), pendingPaId(save)!, seed % 3 === 0 ? 'HOME_RUN' : undefined);
      else save = advanceRound(save);
    }
    expect(save.league.round).toBe(144); expect(save.league.results).toHaveLength(720);
    expect(save.highlightCount).toBeLessThanOrEqual(3); expect(save.eventsThisSeason).toBe(0);
    expect(save.seasons).toHaveLength(1); expect(save.postseason?.champion).toBeTruthy();
    for (const team of save.league.standings) expect(team.w + team.l + team.t).toBe(144);
    const runs = Object.values(save.league.hitters).reduce((n, h) => n + h.runs, 0);
    expect(Object.values(save.league.pitchers).reduce((n, p) => n + p.er, 0)).toBe(runs);
    for (const h of Object.values(save.league.hitters)) expect(h.pa).toBe(h.ab + h.bb);
    if ((seed + 1) % 10 === 0) console.log('First-season careers checked:', seed + 1);
  }
});
it.each(['HITTER', 'PITCHER'] as const)('%s 16~38세 고교 3년·프로 20시즌·이적·자동 은퇴', role => {
  let save = createCareer({ name: '롱런', role, teamId: 'lg', schoolId: SCHOOLS[0].id, hand: 'RIGHT' }, 314);
  while (save.phase !== 'RETIRED') {
    if (save.phase === 'DRAFT') save = signDraft(save);
    else if (save.phase === 'SEASON_RESULT') {
      if (!isYouth(save)) save = signContract(save, 1);
      if (save.pendingTrade) save = resolveTrade(save, false);
      save = nextSeason(save);
    } else save = advanceRound(save, { interactive: false, autoChoices: true });
  }
  expect(save.player.age).toBe(38); expect(save.seasons).toHaveLength(20); expect(save.youth?.history).toHaveLength(3);
  expect(new Set(save.seasons.map(s => s.year)).size).toBe(20);
  for (const p of save.players) for (const v of Object.values(p.skills)) { expect(v).toBeGreaterThanOrEqual(1); expect(v).toBeLessThanOrEqual(99); }
  console.log(role, '3 school years + 20 pro seasons completed, history:', save.seasons.length);
});
