import {resolveDecisions} from './resolve-decisions';
import { expect, it } from 'vitest';
import { createCareer } from '../engine/career';
import { advanceRound, nextSeason, retire } from '../engine/season';
import { chooseEvent, EVENTS } from '../engine/events';
import { signContract } from '../engine/contracts';
import { calculateAwards } from '../engine/awards';
it('이벤트는 역할을 지키고 선택이 한 번만 반영된다', () => {
  const save = createCareer({ name: '이벤트', role: 'HITTER', teamId: 'lg', hand: 'RIGHT' }, 1);
  save.pendingEvent = 'swing'; const next = chooseEvent(save, 'swing', 0);
  expect(next.player.skills.contact).toBe(save.player.skills.contact + 2);
  expect(next.eventsThisSeason).toBe(1); expect(chooseEvent(next, 'swing', 0)).toBe(next);
  expect(EVENTS.length).toBeGreaterThanOrEqual(12);
});
it('포스트시즌은 정규 기록과 분리되고 이적 후 구단별 선수 수를 보존한다', () => {
  let save = createCareer({ name: '계약', role: 'PITCHER', teamId: 'lg', hand: 'RIGHT' }, 5);
  save.contractService = { days: 1160, faUses: 0, lastFADays: 0, activeRounds: 0 };
  while (save.phase !== 'SEASON_RESULT') save = advanceRound(save, { interactive: false, autoChoices: true });
  expect(save.postseason?.games.length).toBeGreaterThanOrEqual(7);
  expect(new Set(save.postseason?.games.map(g => g.stage))).toEqual(new Set(['와일드카드', '준플레이오프', '플레이오프', '한국시리즈']));
  expect(save.awards.filter(a=>a.title!=='한국시리즈 MVP')).toEqual(calculateAwards(save.league, save.players));
  const seriesAwards=save.awards.filter(a=>a.title==='한국시리즈 MVP');
  expect(seriesAwards).toHaveLength(1);
  expect(save.players.find(p=>p.id===seriesAwards[0].playerId)?.teamId).toBe(save.postseason?.champion);
  expect(save.league.results).toHaveLength(720);
  expect(save.contractOffers).toHaveLength(4);
  const moved = signContract(save, 1);
  expect(moved.player.teamId).not.toBe(save.player.teamId);
  expect(moved.contractHistory).toHaveLength(2);
  const next = nextSeason(resolveDecisions(moved));
  expect(next.player.salaryCR).toBe(moved.player.salaryCR);
  expect(next.player.contractYearsLeft).toBe(3);
  for (const team of next.league.standings) {
    expect(next.players.filter(p => p.teamId === team.teamId)).toHaveLength(18);
    expect(next.players.filter(p => p.teamId === team.teamId && p.role === 'PITCHER')).toHaveLength(8);
  }
  expect(retire({ ...save, player: { ...save.player, age: 35 } }).phase).toBe('RETIRED');
  expect(retire(save).phase).toBe('RETIRED');
}, 30000);
