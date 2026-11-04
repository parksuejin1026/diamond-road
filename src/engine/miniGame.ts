import type { PAResult, Skills } from '../domain/types';
import { sampleAutoPA } from './atBat';
import { BALANCE } from './gameBalance';
import { Rng } from './rng';
export type PitchType = keyof typeof BALANCE.flightMs;
export type Strategy = keyof typeof BALANCE.timingMs;
export type PitchCall = PAResult | 'BALL' | 'STRIKE' | 'FOUL';
export interface Count { balls: number; strikes: number; pitches: number; result: PAResult | null; }
export interface Pitch { type: PitchType; duration: number; zone: number; inZone: boolean; }
export const emptyCount = (): Count => ({ balls: 0, strikes: 0, pitches: 0, result: null });
export function updateCount(count: Count, call: PitchCall): Count {
  if (count.result) return count;
  const next = { ...count, pitches: count.pitches + 1 };
  if (call === 'BALL') { if (++next.balls === 4) next.result = 'WALK'; }
  else if (call === 'STRIKE') { if (++next.strikes === 3) next.result = 'STRIKEOUT'; }
  else if (call === 'FOUL') next.strikes = Math.min(2, next.strikes + 1);
  else next.result = call;
  return next;
}
export function nextPitch(rng: Rng): Pitch {
  const type = (['FASTBALL', 'SLIDER', 'CHANGEUP'] as PitchType[])[rng.int(0, 2)];
  return { type, duration: BALANCE.flightMs[type], zone: rng.int(0, 8), inZone: rng.next() < .7 };
}
function battedBall(batter: Skills, pitcher: Skills, strategy: Strategy, rng: Rng): PitchCall {
  if (rng.next() < BALANCE.foulChance) return 'FOUL';
  const adjusted = { ...batter, power: Math.max(1, Math.min(99, batter.power + (strategy === 'POWER' ? 16 : strategy === 'CONTACT' ? -14 : 0))) };
  // Conditional sampling: a contacted ball cannot become a walk or strikeout.
  for (let i = 0; i < 100; i++) { const result = sampleAutoPA(adjusted, pitcher, rng); if (result !== 'WALK' && result !== 'STRIKEOUT') return result; }
  return 'BALL_IN_PLAY_OUT';
}
export function resolveHitterPitch(pitch: Pitch, swingDeltaMs: number | null, strategy: Strategy, batter: Skills, pitcher: Skills, rng: Rng): PitchCall {
  if (swingDeltaMs === null) return pitch.inZone ? 'STRIKE' : 'BALL';
  const window = BALANCE.timingMs[strategy] + (batter.contact - 50) / 49 * 25;
  if (Math.abs(swingDeltaMs) > window || (!pitch.inZone && rng.next() < .6)) return 'STRIKE';
  return battedBall(batter, pitcher, strategy, rng);
}
export function gaugePosition(elapsedMs: number) { return (Math.sin(elapsedMs / 420) + 1) / 2; }
export function pitchingScatter(control: number, error: number, noise: number) { return Math.max(0, Math.min(1, error)) * .8 + (1 - control / 110) * noise * .55; }
export function resolvePitcherPitch(type: PitchType, zone: number, error: number, batter: Skills, pitcher: Skills, rng: Rng, repetitions = 0): PitchCall {
  const scatter = pitchingScatter(pitcher.control, error, rng.next());
  const edge = zone === 4 ? .18 : .08;
  const inZone = scatter < .55 - edge;
  const swing = rng.next() < (inZone ? .78 : .28 + scatter * .12);
  if (!swing) return inZone ? 'STRIKE' : 'BALL';
  const whiff = Math.max(.08, Math.min(.55, .22 + (pitcher.velocity - batter.contact) * .002 + (type === 'SLIDER' ? .07 : type === 'CHANGEUP' ? .04 : 0) - error * .12 - Math.min(3, repetitions) * .025));
  if (rng.next() < whiff) return 'STRIKE';
  return battedBall(batter, { ...pitcher, breaking: Math.max(1, pitcher.breaking - error * 25) }, 'NORMAL', rng);
}
export const RESULT_LABELS: Record<PitchCall, string> = { BALL: '볼', STRIKE: '스트라이크', FOUL: '파울', WALK: '볼넷', STRIKEOUT: '삼진', SINGLE: '안타', DOUBLE: '2루타', TRIPLE: '3루타', HOME_RUN: '홈런', BALL_IN_PLAY_OUT: '인플레이 아웃' };
