import {resolveDecisions} from './resolve-decisions';
import { expect, it } from 'vitest';
import { createCareer } from '../engine/career';
import { advanceRound, nextSeason } from '../engine/season';
import type { CareerSave } from '../engine/career';
const create = (role: 'HITTER' | 'PITCHER' = 'HITTER') => createCareer({ name: '신인', role, teamId: 'lg', hand: 'RIGHT' }, 42);
function finish(save: CareerSave) { while (save.phase !== 'SEASON_RESULT' && save.phase !== 'RETIRED') save = advanceRound(save, { interactive: false, autoChoices: true }); return save; }
it('라운드 진행은 원본 불변이며 저장·복구 후에도 결정적이다', () => {
  const original = create(); const first = advanceRound(original);
  expect(original.league.results).toHaveLength(0);
  expect(first.league.results).toHaveLength(5);
  expect(advanceRound(JSON.parse(JSON.stringify(first)))).toEqual(advanceRound(first));
});
it.each(['HITTER', 'PITCHER'] as const)('%s의 정규시즌 720경기 및 기록 불변식', role => {
  const save = finish(create(role)); const league = save.league;
  expect(league.results).toHaveLength(720);
  expect(new Set(league.results.map(g => g.id)).size).toBe(720);
  expect(league.standings.reduce((a, t) => a + t.w, 0)).toBe(league.standings.reduce((a, t) => a + t.l, 0));
  for (const team of league.standings) expect(team.w + team.l + team.t).toBe(144);
  const hitters = Object.values(league.hitters); const pitchers = Object.values(league.pitchers);
  for (const h of hitters) { expect(h.pa).toBe(h.ab + h.bb); expect(h.h).toBeGreaterThanOrEqual(h.doubles + h.triples + h.hr); expect(h.g).toBeLessThanOrEqual(144); }
  expect(hitters.reduce((n, h) => n + h.runs, 0)).toBe(league.results.reduce((n, g) => n + g.home + g.away, 0));
  expect(pitchers.reduce((n, p) => n + p.er, 0)).toBe(hitters.reduce((n, h) => n + h.runs, 0));
  expect(pitchers.reduce((n, p) => n + p.hits, 0)).toBe(hitters.reduce((n, h) => n + h.h, 0));
  expect(pitchers.reduce((n, p) => n + p.wins, 0)).toBe(league.standings.reduce((n, t) => n + t.w, 0));
  expect(pitchers.reduce((n, p) => n + p.losses, 0)).toBe(pitchers.reduce((n, p) => n + p.wins, 0));
  if (role === 'PITCHER') { expect(league.pitchers.user.g).toBeGreaterThan(0); expect(league.pitchers.user.gs).toBeLessThanOrEqual(28); }
  else expect(league.hitters.user.pa).toBeGreaterThan(0);
  expect(save.seasons).toHaveLength(1); expect(advanceRound(save)).toBe(save);
}, 30000);
it('5시즌을 연속 진행해 통산 이력을 중복시키지 않는다', () => {
  let save = create();
  for (let i = 0; i < 5; i++) {
    save = finish(save); expect(save.seasons).toHaveLength(i + 1);
    const next = nextSeason(resolveDecisions(save));
    expect(next.player.age).toBe(19 + i); expect(next.league.round).toBe(0);
    expect(next.league.results).toHaveLength(0); expect(next.trained).toBe(false);
    expect(nextSeason(next)).toBe(next);
    save = next;
  }
}, 60000);
it('38세 시즌 후 은퇴하고 추가 시즌을 생성하지 않는다', () => {
  const start = create(); start.player.age = 38;
  const retired = nextSeason(finish(start));
  expect(retired.phase).toBe('RETIRED'); expect(retired.seasons).toHaveLength(1);
  expect(nextSeason(retired)).toBe(retired); expect(advanceRound(retired)).toBe(retired);
}, 30000);
