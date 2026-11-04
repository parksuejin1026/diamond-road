import type { Player } from '../domain/types';
import type { LeagueSeason, SeasonSnapshot } from './season';
import { hitterRates, pitcherRates } from '../domain/calculators';
import { BALANCE } from './gameBalance';
export interface Award { title: string; playerId: string; }
export function calculateAwards(league: LeagueSeason, players: Player[]): Award[] {
  const awards: Award[] = [];
  const leader = (title: string, ids: string[], metric: (id: string) => number) => {
    const id = [...ids].sort((a, b) => metric(b) - metric(a) || a.localeCompare(b))[0];
    if (id) awards.push({ title, playerId: id });
  };
  const hitters = Object.keys(league.hitters); const pitchers = Object.keys(league.pitchers);
  leader('타격왕', hitters.filter(id => league.hitters[id].pa >= 400), id => hitterRates(league.hitters[id]).avg);
  leader('홈런왕', hitters, id => league.hitters[id].hr);
  leader('타점왕', hitters, id => league.hitters[id].rbi);
  leader('평균자책점 1위', pitchers.filter(id => league.pitchers[id].outs >= 300), id => -(pitcherRates(league.pitchers[id]).era ?? Infinity));
  leader('탈삼진왕', pitchers, id => league.pitchers[id].so);
  leader('다승왕', pitchers, id => league.pitchers[id].wins);
  const w = BALANCE.awardWeights;
  leader('시즌 MVP', [...hitters, ...pitchers], id => {
    const h = league.hitters[id]; const p = league.pitchers[id];
    const team = players.find(player => player.id === id)?.teamId;
    const teamWins = league.standings.find(t => t.teamId === team)?.w ?? 0;
    const workload = p && p.gs === 0 && p.outs > 270 ? 270 / p.outs : 1;
    return (h ? h.h * w.hitterHits + (h.h + h.doubles + h.triples * 2 + h.hr * 3) * w.hitterBases + h.bb * w.hitterWalk + h.rbi * w.hitterRbi + h.runs * w.hitterRuns + h.ab * w.hitterAb + h.so * w.hitterSo : (p.outs * w.pitcherOuts + p.so * w.pitcherSo + p.er * w.pitcherEr + p.wins * w.pitcherWins) * workload) + teamWins * w.teamWins;
  });
  return awards;
}
export function legacyGrade(seasons: SeasonSnapshot[]) {
  const score = seasons.reduce((n, s) => n + (s.hitter ? s.hitter.h + s.hitter.hr * 8 : (s.pitcher?.so ?? 0) + (s.pitcher?.wins ?? 0) * 12) + (s.awards?.length ?? 0) * 100 + (s.championship ? 250 : 0), 0);
  return { score, grade: score >= 14000 ? 'GOAT' : score >= 8500 ? 'LEGEND' : score >= 4000 ? 'ALL_STAR' : score >= 1000 ? 'REGULAR' : 'ROOKIE' };
}
