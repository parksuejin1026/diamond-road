import type { PAResult, Skills } from '../domain/types';
import { Rng } from './rng';
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
export function paProbabilities(b: Skills, p: Skills): Record<PAResult, number> {
  const result = {
    WALK: clamp(.08 + (b.eye - 50) * .0008 - (p.control - 50) * .0005, .02, .16),
    STRIKEOUT: clamp(.22 - (b.contact - 50) * .0015 + (p.velocity - 50) * .001, .09, .38),
    SINGLE: clamp(.155 + (b.contact - 50) * .0011 - (p.breaking - 50) * .0003, .07, .23),
    DOUBLE: clamp(.047 + (b.power - 50) * .00045, .01, .08),
    TRIPLE: clamp(.004 + (b.speed - 50) * .00005, .001, .01),
    HOME_RUN: clamp(.028 + (b.power - 50) * .0006 - (p.breaking - 50) * .0002, .005, .075),
    BALL_IN_PLAY_OUT: 0,
  };
  result.BALL_IN_PLAY_OUT = 1 - Object.values(result).reduce((a, v) => a + v, 0);
  return result;
}
export function sampleAutoPA(b: Skills, p: Skills, rng: Rng): PAResult {
  let roll = rng.next();
  for (const [result, probability] of Object.entries(paProbabilities(b, p))) {
    roll -= probability;
    if (roll < 0) return result as PAResult;
  }
  return 'BALL_IN_PLAY_OUT';
}
