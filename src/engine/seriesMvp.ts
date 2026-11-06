import type {Player} from '../domain/types';
import type {LeagueSeason} from './season';
import type {Award} from './awards';

// A game-specific contribution index, not a reproduction of a media vote or WAR.
// The caller supplies only Korean Series stats, never the entire postseason.
export function calculateSeriesMvp(league: LeagueSeason, players: Player[], champion: string): Award | null {
  const candidates = players.filter(player => player.teamId === champion).flatMap(player => {
    const h = league.hitters[player.id], p = league.pitchers[player.id];
    if (player.role === 'HITTER' && h && h.pa > 0) return [{id: player.id,
      score: h.h * 2 + h.doubles + h.triples * 2 + h.hr * 4 + h.bb + h.rbi * .5 + h.runs * .5 - (h.ab - h.h) * .2}];
    if (player.role === 'PITCHER' && p && p.outs > 0) return [{id: player.id,
      score: p.outs * .6 + p.so * .5 - p.er * 2 - p.hits * .3 - p.bb * .5}];
    return [];
  });
  candidates.sort((a,b) => b.score - a.score || a.id.localeCompare(b.id));
  return candidates[0] ? {title: '한국시리즈 MVP', playerId: candidates[0].id} : null;
}
