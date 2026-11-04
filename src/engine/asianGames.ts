import type { CareerSave } from './career';
import type { HitterStats, PitcherStats, Player, FieldPosition } from '../domain/types';
import { overall, hitterRates, pitcherRates } from '../domain/calculators';
import { Rng } from './rng';
import { makePlayer } from './roster';
import { emptyLeague, simulateInternationalFixture, type GameResult } from './season';
export const ASIAN_COUNTRIES = [
  { id: 'jpn', name: '일본', group: 'A', strength: 76 }, { id: 'chn', name: '중국', group: 'A', strength: 59 },
  { id: 'phi', name: '필리핀', group: 'A', strength: 49 }, { id: 'ple', name: '팔레스타인', group: 'A', strength: 42 },
  { id: 'tpe', name: '대만', group: 'B', strength: 73 }, { id: 'kor', name: '대한민국', group: 'B', strength: 72 },
  { id: 'hkg', name: '홍콩', group: 'B', strength: 45 }, { id: 'tha', name: '태국', group: 'B', strength: 46 },
] as const;
export interface NationalPlayer { id: string; name: string; role: Player['role']; age: number; ovr: number; clubTeamId: string; position?: FieldPosition; wildcard: boolean; }
export interface AsianGamesReport { year: number; selected: boolean; reason: string; rank: number; medal: 'GOLD' | 'SILVER' | 'BRONZE' | null; roster: NationalPlayer[]; games: GameResult[]; hitter: HitterStats | null; pitcher: PitcherStats | null; reputationGain: number; }
export const isAsianGamesYear = (year: number) => year >= 2026 && (year - 2026) % 4 === 0;
export const countryName = (id: string) => ASIAN_COUNTRIES.find(country => country.id === id)?.name ?? id;
function selectionScore(save: CareerSave, player: Player) {
  const h = save.league.hitters[player.id]; const p = save.league.pitchers[player.id];
  const performance = h && h.pa >= 50 ? (hitterRates(h).ops - .65) * 12 + h.hr * .12 : p && p.outs >= 30 ? (4.5 - (pitcherRates(p).era ?? 4.5)) * 2 + p.so * .025 : 0;
  return overall(player) + Math.max(-5, Math.min(15, performance));
}
export function selectNationalRoster(save: CareerSave, rng: Rng): Player[] {
  const candidates = save.players.filter(player => player.age >= 19 && player.age <= 29 && player.rosterStatus !== 'INJURED' && player.rosterStatus !== 'MINORS');
  // Fictional amateur reserves fill gaps when the generated professional league has few young players.
  for (const role of ['HITTER', 'PITCHER'] as const) for (let i = 0; i < 12; i++) {
    const player = makePlayer(`ag-kor-reserve-${role}-${i}`, `대표 후보 ${role === 'HITTER' ? '타자' : '투수'} ${i + 1}`, role, 'amateur', rng);
    player.age = rng.int(19, 22); player.skills = Object.fromEntries(Object.keys(player.skills).map(key => [key, rng.int(52, 65)])); candidates.push(player);
  }
  const compare = (a: Player, b: Player) => selectionScore(save, b) - selectionScore(save, a) || a.id.localeCompare(b.id);
  const wildcardIds = new Set(candidates.filter(player => player.age > 25).sort(compare).slice(0, 3).map(player => player.id));
  const eligible = candidates.filter(player => player.age <= 25 || wildcardIds.has(player.id));
  return (['HITTER', 'PITCHER'] as const).flatMap(role => eligible.filter(player => player.role === role).sort(compare).slice(0, 12));
}
function ranked(ids: string[], games: GameResult[]) {
  return ids.map(id => {
    let wins = 0, difference = 0, scored = 0;
    for (const game of games) {
      if (!ids.includes(game.homeTeamId) || !ids.includes(game.awayTeamId)) continue;
      if (game.homeTeamId !== id && game.awayTeamId !== id) continue;
      const mine = game.homeTeamId === id ? game.home : game.away;
      const theirs = game.homeTeamId === id ? game.away : game.home;
      if (mine > theirs) wins++; difference += mine - theirs; scored += mine;
    }
    return { id, wins, difference, scored };
  }).sort((a, b) => b.wins - a.wins || b.difference - a.difference || b.scored - a.scored || a.id.localeCompare(b.id)).map(row => row.id);
}
export function simulateAsianGames(save: CareerSave): AsianGamesReport | null {
  if (!isAsianGamesYear(save.year) || (save.youth && !save.youth.graduated)) return null;
  const previous = save.asianGames?.find(report => report.year === save.year); if (previous) return previous;
  // Separate seeded stream leaves club results and club RNG unchanged.
  const rng = new Rng((save.seed ^ save.year ^ 0x41a51a) >>> 0);
  const korean = selectNationalRoster(save, rng);
  const selected = korean.some(player => player.id === save.player.id);
  const roster = korean.map(player => ({ id: player.id, name: player.name, role: player.role, age: player.age, ovr: overall(player), clubTeamId: player.teamId, position: player.position, wildcard: player.age > 25 }));
  const players = korean.map(player => ({ ...structuredClone(player), teamId: 'kor' }));
  for (const country of ASIAN_COUNTRIES.filter(country => country.id !== 'kor')) {
    for (let i = 0; i < 24; i++) {
      const player = makePlayer(`ag-${country.id}-${i}`, `${country.name} 선수 ${i + 1}`, i < 12 ? 'HITTER' : 'PITCHER', country.id, rng);
      player.skills = Object.fromEntries(Object.keys(player.skills).map(key => [key, Math.max(1, Math.min(99, country.strength + rng.int(-8, 8)))])); players.push(player);
    }
  }
  const player = players.find(player => player.id === save.player.id) ?? players[0];
  player.rosterStatus = 'STARTER'; player.injuredUntil = 0;
  const cup: CareerSave = { ...save, youth: null, player, players, league: emptyLeague(players), pendingGame: null };
  let counter = 0;
  const play = (a: string, b: string, stage: string) => {
    const game = simulateInternationalFixture(cup, { id: `ag-${save.year}-${++counter}`, round: counter, homeTeamId: a, awayTeamId: b }, rng);
    game.stage = stage; return game.home > game.away ? a : b;
  };
  const groups = ['A', 'B'].map(group => ASIAN_COUNTRIES.filter(country => country.group === group).map(country => String(country.id)));
  for (const ids of groups) for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) play(ids[i], ids[j], '조별리그');
  const ordered = groups.map(ids => ranked(ids, cup.league.results));
  for (const offset of [0, 2]) for (const a of ordered[0].slice(offset, offset + 2)) for (const b of ordered[1].slice(offset, offset + 2)) play(a, b, offset === 0 ? '슈퍼라운드' : '순위 결정전');
  const upper = ranked([...ordered[0].slice(0, 2), ...ordered[1].slice(0, 2)], cup.league.results);
  const lower = ranked([...ordered[0].slice(2), ...ordered[1].slice(2)], cup.league.results);
  const bronze = play(upper[2], upper[3], '동메달 결정전');
  const gold = play(upper[0], upper[1], '금메달 결정전');
  const final = [gold, upper.find(id => id !== gold && upper.indexOf(id) < 2)!, bronze, upper.find(id => id !== bronze && upper.indexOf(id) >= 2)!, ...lower];
  const rank = final.indexOf('kor') + 1;
  const medal = rank === 1 ? 'GOLD' : rank === 2 ? 'SILVER' : rank === 3 ? 'BRONZE' : null;
  const reputationGain = selected ? 2 + (rank === 1 ? 8 : rank === 2 ? 4 : rank === 3 ? 2 : 0) : 0;
  const report: AsianGamesReport = { year: save.year, selected, reason: selected ? save.player.age > 25 ? '와일드카드 선발' : '능력·시즌 성적을 통한 선발' : save.player.age < 19 || save.player.age > 29 ? '게임 대표팀 연령 기준 밖' : save.player.rosterStatus === 'INJURED' || save.player.rosterStatus === 'MINORS' ? '부상 또는 2군 상태로 제외' : '동 역할 대표팀 경쟁에서 미선발', rank, medal, roster, games: cup.league.results, hitter: selected && save.player.role === 'HITTER' ? { ...cup.league.hitters[save.player.id] } : null, pitcher: selected && save.player.role === 'PITCHER' ? { ...cup.league.pitchers[save.player.id] } : null, reputationGain };
  save.asianGames = [...(save.asianGames ?? []), report];
  save.player.reputation = Math.min(100, (save.player.reputation ?? 0) + reputationGain);
  save.players = save.players.map(player => player.id === save.player.id ? save.player : player);
  return report;
}
