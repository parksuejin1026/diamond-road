import { describe, expect, it } from 'vitest';
import { Rng } from '../engine/rng';
import { createSchedule, TEAMS } from '../engine/schedule';
import { createCareer, train } from '../engine/career';
import { createGame, applyPlateAppearanceOutcome } from '../engine/game';
import { paProbabilities, sampleAutoPA } from '../engine/atBat';
import { hitterRates, pitcherRates } from '../domain/calculators';
import type { PAResult, GameState } from '../domain/types';
const config = { name: '루키', role: 'HITTER' as const, teamId: 'lg', hand: 'RIGHT' as const };
function apply(game: GameState, result: PAResult, seed = 1) { return applyPlateAppearanceOutcome(game, { paId: 'one', batterId: 'batter', result }, new Rng(seed)); }
describe('결정적 생성', () => {
  it('동일 시드의 선수·NPC·대진표와 RNG 복구가 일치한다', () => {
    expect(createCareer(config, 42)).toEqual(createCareer(config, 42));
    const rng = new Rng(42); rng.next();
    expect(new Rng(rng.state).next()).toBe(rng.next());
    const career = createCareer(config, 42);
    expect(career.players).toHaveLength(180);
    expect(career.players.filter(p => p.teamId === 'lg' && p.role === 'HITTER')).toHaveLength(10);
    expect(createCareer({ ...config, role: 'PITCHER' }, 42).players.filter(p => p.teamId === 'lg' && p.role === 'PITCHER')).toHaveLength(8);
  });
  it('훈련은 한 번만 적용하며 원본을 변경하지 않는다', () => {
    const a = createCareer(config, 1); const b = train(a, 'contact');
    expect(b.player.skills.contact).toBe(a.player.skills.contact + 2);
    expect(train(b, 'power')).toBe(b);
    expect(a.trained).toBe(false);
    expect(() => createCareer({ ...config, name: '   ' }, 1)).toThrow();
  });
});
it('720경기·팀당 144경기·상대별 홈/원정 8경기·라운드 충돌 없음', () => {
  const ids = TEAMS.map(t => t.id);
  const schedule = createSchedule(ids, 42);
  expect(schedule).toHaveLength(720);
  expect(new Set(schedule.map(g => g.id)).size).toBe(720);
  for (let round = 1; round <= 144; round++) {
    const games = schedule.filter(g => g.round === round);
    expect(games).toHaveLength(5);
    expect(new Set(games.flatMap(g => [g.homeTeamId, g.awayTeamId])).size).toBe(10);
  }
  for (const a of ids) for (const b of ids.filter(id => id !== a)) expect(schedule.filter(g => g.homeTeamId === a && g.awayTeamId === b)).toHaveLength(8);
});
describe('타석과 경기 규칙', () => {
  it('2아웃 만루 홈런과 밀어내기 볼넷', () => {
    const game = { ...createGame(), outs: 2, bases: ['a', 'b', 'c'] };
    const hr = apply(game, 'HOME_RUN');
    expect(hr.game.score.away).toBe(4); expect(hr.game.outs).toBe(2); expect(hr.scored).toHaveLength(4);
    const bb = apply(game, 'WALK');
    expect(bb.game.score.away).toBe(1); expect(bb.game.bases).toEqual(['batter', 'a', 'b']);
    expect(game.bases).toEqual(['a', 'b', 'c']);
  });
  it('병살은 2아웃을 추가하고 득점 없이 이닝을 끝낸다', () => {
    let seed = 0;
    while (new Rng(seed).next() >= .08) seed++;
    const result = apply({ ...createGame(), outs: 1, bases: ['a', null, 'c'] }, 'BALL_IN_PLAY_OUT', seed);
    expect(result.doublePlay).toBe(true); expect(result.game.half).toBe('BOTTOM'); expect(result.game.outs).toBe(0); expect(result.game.score.away).toBe(0);
  });
  it('9회말 생략, 끝내기, 12회 무승부', () => {
    expect(apply({ ...createGame(), inning: 9, outs: 2, score: { home: 2, away: 1 } }, 'STRIKEOUT').game.status).toBe('FINAL');
    expect(apply({ ...createGame(), inning: 9, half: 'BOTTOM' }, 'HOME_RUN').game.status).toBe('FINAL');
    expect(apply({ ...createGame(), inning: 12, half: 'BOTTOM', outs: 2 }, 'STRIKEOUT').game.status).toBe('FINAL');
  });
  it('끝내기 단타는 승리에 필요한 득점만 인정하고 홈런은 전원 득점한다', () => {
    const game = { ...createGame(), inning: 9, half: 'BOTTOM' as const, bases: ['a', 'b', 'c'] };
    expect(apply(game, 'SINGLE').game.score.home).toBe(1);
    expect(apply(game, 'HOME_RUN').game.score.home).toBe(4);
  });
  it('동일 타석 결과를 중복 적용하지 않는다', () => {
    const once = apply(createGame(), 'HOME_RUN').game;
    expect(apply(once, 'HOME_RUN').game).toBe(once);
  });
  it('스킬 극값에서 확률의 합은 1, 모든 값은 0~1이다', () => {
    for (const level of [1, 50, 99]) {
      const b = { contact: level, eye: level, power: level, speed: level };
      for (const opponent of [1, 50, 99]) {
        const values = Object.values(paProbabilities(b, { control: opponent, velocity: opponent, breaking: opponent }));
        expect(values.reduce((a, v) => a + v, 0)).toBeCloseTo(1);
        expect(values.every(p => p >= 0 && p <= 1)).toBe(true);
      }
    }
  });
  it('100개의 자동 경기에서 종료와 점수·아웃 불변식을 유지한다', () => {
    const skills = { contact: 50, eye: 50, power: 50, speed: 50, control: 50, velocity: 50, breaking: 50 };
    for (let seed = 0; seed < 100; seed++) {
      let game = createGame(); const rng = new Rng(seed); let pa = 0;
      while (game.status !== 'FINAL' && pa < 2000) {
        const result = sampleAutoPA(skills, skills, rng);
        game = applyPlateAppearanceOutcome(game, { paId: String(pa++), batterId: String(pa), result }, rng).game;
        expect(game.outs).toBeLessThan(3); expect(game.inning).toBeLessThanOrEqual(12);
        expect(game.score.home).toBeGreaterThanOrEqual(0); expect(game.score.away).toBeGreaterThanOrEqual(0);
      }
      expect(game.status).toBe('FINAL');
    }
  });
});
it('비율은 누적 정수 기록에서 계산한다', () => {
  expect(hitterRates({ g: 100, pa: 420, ab: 400, h: 100, doubles: 20, triples: 0, hr: 10, bb: 20, so: 0, rbi: 0, runs: 0 }).avg).toBe(.25);
  expect(pitcherRates({ g: 1, gs: 1, outs: 27, hits: 4, hr: 0, bb: 2, so: 9, er: 2, wins: 1, losses: 0 }).era).toBe(2);
});
