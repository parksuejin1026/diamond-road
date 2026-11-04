import type { GameState, PAOutcome } from '../domain/types';
import { Rng } from './rng';
export const createGame = (): GameState => ({ inning: 1, half: 'TOP', outs: 0, bases: [null, null, null], score: { home: 0, away: 0 }, appliedPaIds: [], status: 'RUNNING' });
export function applyPlateAppearanceOutcome(original: GameState, pa: PAOutcome, rng: Rng): { game: GameState; scored: string[]; doublePlay: boolean } {
  if (original.status === 'FINAL' || original.appliedPaIds.includes(pa.paId)) return { game: original, scored: [], doublePlay: false };
  const g = structuredClone(original);
  g.appliedPaIds.push(pa.paId);
  const scored: string[] = [];
  let doublePlay = false;
  const score = (id: string | null) => { if (id) scored.push(id); };
  const [first, second, third] = g.bases;
  if (pa.result === 'WALK') {
    if (first) { if (second) { score(third); g.bases[2] = second; } g.bases[1] = first; }
    g.bases[0] = pa.batterId;
  } else if (pa.result === 'HOME_RUN') {
    g.bases.forEach(score); score(pa.batterId); g.bases = [null, null, null];
  } else if (pa.result === 'TRIPLE') {
    g.bases.forEach(score); g.bases = [null, null, pa.batterId];
  } else if (pa.result === 'DOUBLE') {
    score(third); score(second);
    const home = !!first && rng.next() < .6;
    if (home) score(first);
    g.bases = [null, pa.batterId, home ? null : first];
  } else if (pa.result === 'SINGLE') {
    score(third); score(second);
    const advance = !!first && g.outs === 2 && rng.next() < .25;
    g.bases = [pa.batterId, advance ? null : first, advance ? first : null];
  } else {
    doublePlay = pa.result === 'BALL_IN_PLAY_OUT' && !!first && g.outs < 2 && rng.next() < .08;
    g.outs += doublePlay ? 2 : 1;
    if (doublePlay) g.bases[0] = null;
  }
  if (g.inning >= 9 && g.half === 'BOTTOM' && pa.result !== 'HOME_RUN' && g.score.home + scored.length > g.score.away) scored.splice(Math.max(0, g.score.away - g.score.home + 1));
  g.score[g.half === 'TOP' ? 'away' : 'home'] += scored.length;
  if (g.inning >= 9 && g.half === 'BOTTOM' && g.score.home > g.score.away) g.status = 'FINAL';
  if (g.outs >= 3) {
    g.outs = 0; g.bases = [null, null, null];
    if (g.half === 'TOP') {
      if (g.inning >= 9 && g.score.home > g.score.away) g.status = 'FINAL';
      else g.half = 'BOTTOM';
    } else if (g.inning >= 9 && (g.score.home !== g.score.away || g.inning === 12)) g.status = 'FINAL';
    else { g.inning++; g.half = 'TOP'; }
  }
  return { game: g, scored, doublePlay };
}
