import type { HitterStats, PitcherStats, Player } from './types';
export function hitterRates(s: HitterStats) {
  const avg = s.ab ? s.h / s.ab : 0;
  const obp = s.ab + s.bb ? (s.h + s.bb) / (s.ab + s.bb) : 0;
  const slg = s.ab ? (s.h + s.doubles + 2 * s.triples + 3 * s.hr) / s.ab : 0;
  return { avg, obp, slg, ops: obp + slg };
}
export const pitcherRates = (s: PitcherStats) => ({ era: s.outs ? s.er * 27 / s.outs : null, whip: s.outs ? (s.hits + s.bb) * 3 / s.outs : null });
export function overall(p: Player) {
  const weights = p.role === 'HITTER' ? { contact: .30, power: .26, eye: .18, speed: .10, defense: .08, mental: .08 } : { velocity: .27, control: .29, breaking: .23, stamina: .13, mental: .08 };
  return Math.round(Object.entries(weights).reduce((sum, [key, weight]) => sum + p.skills[key] * weight!, 0));
}
