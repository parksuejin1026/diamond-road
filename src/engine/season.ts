import type { GameState, HitterStats, PAResult, PitcherStats, Player, ScheduleGame } from '../domain/types';
import type { CareerSave } from './career';
import { overall } from '../domain/calculators';
import { createGame, applyPlateAppearanceOutcome } from './game';
import { sampleAutoPA } from './atBat';
import { Rng } from './rng';
import { TEAMS, createSchedule } from './schedule';
import { maybeEvent, chooseEvent } from './events';
import { createOffers } from './contracts';
import { calculateAwards } from './awards';
import { isYouth, finishSchoolYear, nextSchoolYear, seasonRounds, type SchoolCup } from './youth';
import { createRoster } from './roster';
export interface Standing { teamId: string; w: number; l: number; t: number; }
export interface GameResult { id: string; round: number; homeTeamId: string; awayTeamId: string; home: number; away: number; innings: number; stage?: string; }
export interface LeagueSeason { round: number; standings: Standing[]; hitters: Record<string, HitterStats>; pitchers: Record<string, PitcherStats>; results: GameResult[]; }
export interface SeasonSnapshot { year: number; age: number; teamId: string; hitter: HitterStats | null; pitcher: PitcherStats | null; rank: number; ovr: number; awards?: string[]; championship?: boolean; }
export interface ClubRuntime { lineup: string[]; bench: string | null; pitchers: string[]; active: string; starter: string; relief: number; pitches: number; index: number; appeared: string[]; }
export interface PendingGame { fixture: ScheduleGame; clubs: ClubRuntime[]; game: GameState; pa: number; responsible: Record<string, string>; initialOuts: Record<string, number>; winningPitcher: string; losingPitcher: string; prepared: boolean; }
export interface HighlightFeedback { result: PAResult; before: { home: number; away: number }; after: { home: number; away: number }; paId: string; }
export const emptyHitter = (): HitterStats => ({ g: 0, pa: 0, ab: 0, h: 0, doubles: 0, triples: 0, hr: 0, bb: 0, so: 0, rbi: 0, runs: 0, gidp: 0 });
export const emptyPitcher = (): PitcherStats => ({ g: 0, gs: 0, outs: 0, hits: 0, hr: 0, bb: 0, so: 0, er: 0, wins: 0, losses: 0 });
export function emptyLeague(players: Player[]): LeagueSeason {
  return { round: 0, standings: [...new Set(players.map(p => p.teamId))].map(teamId => ({ teamId, w: 0, l: 0, t: 0 })), hitters: Object.fromEntries(players.filter(p => p.role === 'HITTER').map(p => [p.id, emptyHitter()])), pitchers: Object.fromEntries(players.filter(p => p.role === 'PITCHER').map(p => [p.id, emptyPitcher()])), results: [] };
}
export function standings(league: LeagueSeason): Standing[] {
  const rate = (t: Standing) => t.w + t.l ? t.w / (t.w + t.l) : 0;
  return [...league.standings].sort((a, b) => rate(b) - rate(a) || b.w - a.w || a.teamId.localeCompare(b.teamId));
}
function startGame(fixture: ScheduleGame, save: CareerSave): PendingGame {
  const clubs = [fixture.awayTeamId, fixture.homeTeamId].map(id => {
    const roster = save.players.filter(p => p.teamId === id);
    const hitters = roster.filter(p => p.role === 'HITTER').map(p => p.id);
    const pitchers = roster.filter(p => p.role === 'PITCHER').map(p => p.id);
    if (id === save.player.teamId) {
      const absent = save.player.rosterStatus === 'MINORS' || (save.player.injuredUntil ?? 0) >= fixture.round;
      if (save.player.role === 'HITTER') {
        const userSlot = hitters.indexOf(save.player.id);
        if (absent) hitters.splice(userSlot, 1);
        else if (save.player.rosterStatus === 'STARTER' && userSlot === 9) [hitters[8], hitters[9]] = [hitters[9], hitters[8]];
        else if (save.player.rosterStatus !== 'STARTER' && userSlot !== 9) [hitters[userSlot], hitters[9]] = [hitters[9], hitters[userSlot]];
      } else {
        const slot = pitchers.indexOf(save.player.id);
        const target = isYouth(save) ? 2 : 4;
        [pitchers[slot], pitchers[target]] = [pitchers[target], pitchers[slot]];
        if (absent) pitchers[target] = pitchers[0];
        else if (isYouth(save) && save.player.rosterStatus === 'BENCH') [pitchers[target], pitchers[5]] = [pitchers[5], pitchers[target]];
      }
    }
    const starter = pitchers[(fixture.round - 1) % (isYouth(save) ? 3 : 5)];
    save.league.pitchers[starter].g++; save.league.pitchers[starter].gs++;
    return { lineup: hitters.slice(0, 9), bench: hitters[9] ?? null, pitchers, active: starter, starter, relief: 0, pitches: 0, index: 0, appeared: [starter] };
  });
  return { fixture, clubs, game: createGame(), pa: 0, responsible: {}, initialOuts: Object.fromEntries(Object.entries(save.league.pitchers).map(([id, p]) => [id, p.outs])), winningPitcher: clubs[0].starter, losingPitcher: clubs[1].starter, prepared: false };
}
export function currentMatch(pending: PendingGame) {
  const side = pending.game.half === 'TOP' ? 0 : 1;
  const offense = pending.clubs[side]; const defense = pending.clubs[1 - side];
  return { side, offense, defense, batterId: offense.lineup[offense.index], pitcherId: defense.active };
}
export const pendingPaId = (save: CareerSave) => save.pendingGame ? save.year + '-' + save.pendingGame.fixture.id + '-' + save.pendingGame.pa : null;
function prepare(save: CareerSave) {
  const pending = save.pendingGame!; if (pending.prepared) return;
  const { offense, defense } = currentMatch(pending);
  if (pending.game.inning >= 7 && offense.bench) { offense.lineup[8] = offense.bench; offense.bench = null; }
  const starterActive = defense.active === defense.starter;
  if ((starterActive && (defense.pitches >= 95 || pending.game.inning > 6)) || (!starterActive && defense.pitches >= 25)) {
    if (defense.relief < 3) { defense.active = defense.pitchers[5 + defense.relief++]; defense.pitches = 0; save.league.pitchers[defense.active].g++; }
  }
  const batter = offense.lineup[offense.index];
  if (!offense.appeared.includes(batter)) { save.league.hitters[batter].g++; offense.appeared.push(batter); }
  pending.prepared = true;
}
function commitPA(save: CareerSave, result: PAResult, rng: Rng, pitches?: number) {
  const pending = save.pendingGame!;
  const { side, offense, defense, batterId, pitcherId } = currentMatch(pending);
  const before = pending.game; pending.responsible[batterId] = pitcherId;
  const applied = applyPlateAppearanceOutcome(before, { paId: pendingPaId(save)!, batterId, result }, rng);
  pending.game = applied.game; pending.pa++; pending.prepared = false;
  const h = save.league.hitters[batterId]; const p = save.league.pitchers[pitcherId];
  h.pa++; if (result !== 'WALK') h.ab++;
  if (['SINGLE', 'DOUBLE', 'TRIPLE', 'HOME_RUN'].includes(result)) { h.h++; p.hits++; }
  if (result === 'DOUBLE') h.doubles++;
  if (result === 'TRIPLE') h.triples++;
  if (result === 'HOME_RUN') { h.hr++; p.hr++; }
  if (result === 'WALK') { h.bb++; p.bb++; }
  if (result === 'STRIKEOUT') { h.so++; p.so++; }
  if (applied.doublePlay) h.gidp = (h.gidp ?? 0) + 1;
  h.rbi += applied.scored.length;
  for (const runner of applied.scored) { save.league.hitters[runner].runs++; save.league.pitchers[pending.responsible[runner]].er++; }
  p.outs += result === 'STRIKEOUT' || result === 'BALL_IN_PLAY_OUT' ? applied.doublePlay ? 2 : 1 : 0;
  defense.pitches += pitches ?? rng.int(result === 'WALK' ? 4 : 3, 6); offense.index = (offense.index + 1) % 9;
  const key = side === 0 ? 'away' : 'home'; const other = side === 0 ? 'home' : 'away';
  if (before.score[key] <= before.score[other] && pending.game.score[key] > pending.game.score[other]) {
    pending.winningPitcher = offense.active;
    pending.losingPitcher = pending.responsible[applied.scored[before.score[other] - before.score[key]]] ?? pitcherId;
  }
}
function finishGame(save: CareerSave) {
  const { fixture, game, clubs, initialOuts, losingPitcher } = save.pendingGame!; let { winningPitcher } = save.pendingGame!;
  const home = save.league.standings.find(t => t.teamId === fixture.homeTeamId)!; const away = save.league.standings.find(t => t.teamId === fixture.awayTeamId)!;
  if (game.score.home === game.score.away) { home.t++; away.t++; }
  else {
    const winner = game.score.home > game.score.away ? home : away; const loser = winner === home ? away : home; winner.w++; loser.l++;
    const club = clubs[winner === home ? 1 : 0];
    if (winningPitcher === club.starter && save.league.pitchers[winningPitcher].outs - initialOuts[winningPitcher] < 15) winningPitcher = club.active;
    save.league.pitchers[winningPitcher].wins++; save.league.pitchers[losingPitcher].losses++;
  }
  save.league.results.push({ ...fixture, ...game.score, innings: game.inning }); save.pendingGame = null;
}
function shouldHighlight(save: CareerSave) {
  const pending = save.pendingGame!;
  if (save.highlightCount >= 3 || pending.fixture.round < (isYouth(save) ? [4, 8, 12] : [35, 80, 120])[save.highlightCount]) return false;
  const match = currentMatch(pending);
  return pending.game.inning >= 6 && (pending.game.bases.some(Boolean) || Math.abs(pending.game.score.home - pending.game.score.away) <= 2) && (save.player.role === 'HITTER' ? match.batterId === save.player.id : match.pitcherId === save.player.id);
}
export function advanceRound(original: CareerSave, options: { interactive?: boolean; autoChoices?: boolean } = {}): CareerSave {
  const rounds = seasonRounds(original);
  if (!['PRESEASON', 'SIMULATING'].includes(original.phase) || original.league.round >= rounds) return original;
  if (original.pendingEvent) return options.autoChoices ? advanceRound(chooseEvent(original, original.pendingEvent, 0), options) : original;
  const save = structuredClone(original); const rng = new Rng(save.rngState); save.phase = 'SIMULATING';
  const players = Object.fromEntries(save.players.map(p => [p.id, p]));
  const round = save.league.round + 1;
  for (const fixture of save.schedule.filter(g => g.round === round)) {
    if (save.league.results.some(g => g.id === fixture.id)) continue;
    if (!save.pendingGame) save.pendingGame = startGame(fixture, save);
    while (save.pendingGame.game.status !== 'FINAL') {
      if (save.pendingGame.pa > 5000) throw new Error('경기 진행 상한을 초과했습니다. 마지막 저장에서 다시 시도해 주세요.');
      prepare(save);
      if (options.interactive !== false && shouldHighlight(save)) { save.phase = 'HIGHLIGHT_READY'; save.highlightCount++; save.rngState = rng.state; return save; }
      const match = currentMatch(save.pendingGame);
      const batter = players[match.batterId]; const pitcher = players[match.pitcherId];
      commitPA(save, sampleAutoPA(batter.skills, pitcher.skills, rng), rng);
    }
    finishGame(save);
  }
  save.league.round = round;
  updateCondition(save, rng);
  if (round < rounds) maybeEvent(save, rng);
  save.rngState = rng.state;
  if (round === rounds && isYouth(save)) {
    finishSchoolYear(save, rng, simulateSchoolCups(save, rng));
    save.rngState = rng.state;
  } else if (round === rounds) {
    save.awards = calculateAwards(save.league, save.players);
    save.postseason = simulatePostseason(save, rng);
    if ((save.player.contractYearsLeft ?? 1) <= 1 && save.player.age < 38) save.contractOffers = createOffers(save, rng);
    save.rngState = rng.state;
    save.phase = save.player.age >= 38 ? 'RETIRED' : 'SEASON_RESULT';
    save.seasons.push({ year: save.year, age: save.player.age, teamId: save.player.teamId, hitter: save.league.hitters[save.player.id] ? { ...save.league.hitters[save.player.id] } : null, pitcher: save.league.pitchers[save.player.id] ? { ...save.league.pitchers[save.player.id] } : null, rank: standings(save.league).findIndex(t => t.teamId === save.player.teamId) + 1, ovr: overall(save.player), awards: save.awards.filter(a => a.playerId === save.player.id).map(a => a.title), championship: save.postseason.champion === save.player.teamId });
  }
  return options.autoChoices && save.pendingEvent ? chooseEvent(save, save.pendingEvent, 0) : save;
}
function updateCondition(save: CareerSave, rng: Rng) {
  const player = save.player; const round = save.league.round;
  if (isYouth(save)) {
    save.youth!.trust = Math.min(100, save.youth!.trust + 3);
    if (save.youth!.trust >= 55 && player.rosterStatus === 'BENCH') player.rosterStatus = 'STARTER';
  }
  if (player.rosterStatus === 'INJURED' && round >= (player.injuredUntil ?? 0)) { player.rosterStatus = player.role === 'HITTER' ? 'BENCH' : 'STARTER'; player.health = Math.min(100, player.health + 15); }
  if (player.rosterStatus === 'MINORS' && overall(player) >= 60) player.rosterStatus = player.role === 'HITTER' ? 'BENCH' : 'STARTER';
  if (player.rosterStatus === 'MINORS') player.minorGames = (player.minorGames ?? 0) + (player.role === 'HITTER' || round % 5 === 0 ? 1 : 0);
  const played = player.rosterStatus !== 'MINORS' && player.rosterStatus !== 'INJURED' && (player.role === 'HITTER' || round % (isYouth(save) ? 3 : 5) === 0 || (isYouth(save) && player.rosterStatus === 'BENCH'));
  player.fatigue = Math.max(0, Math.min(100, player.fatigue + (played ? player.role === 'HITTER' ? 3 : 10 : 0) - 2));
  if (played && rng.next() < .002 * (2 - player.health / 100) * (1 + player.fatigue / 100)) {
    player.injuredUntil = round + rng.int(5, 20); player.rosterStatus = 'INJURED'; player.health = Math.max(25, player.health - 15);
  }
  save.players = save.players.map(p => p.id === player.id ? player : p);
}
function simulatePostseason(save: CareerSave, rng: Rng) {
  const post = { ...save, league: emptyLeague(save.players), pendingGame: null } as CareerSave;
  const ranked = standings(save.league).map(t => t.teamId);
  const players = Object.fromEntries(save.players.map(p => [p.id, p]));
  let gameNumber = 0;
  const play = (home: string, away: string, stage: string): string | null => {
    if (++gameNumber > 100) throw new Error('포스트시즌을 완료하지 못했습니다. 다시 시도해 주세요.');
    const fixture = { id: 'post-' + gameNumber, round: seasonRounds(save) + gameNumber, homeTeamId: home, awayTeamId: away, stage };
    post.pendingGame = startGame(fixture, post);
    while (post.pendingGame.game.status !== 'FINAL') {
      if (post.pendingGame.pa > 5000) throw new Error('포스트시즌 경기 상한을 초과했습니다.');
      prepare(post); const match = currentMatch(post.pendingGame);
      commitPA(post, sampleAutoPA(players[match.batterId].skills, players[match.pitcherId].skills, rng), rng);
    }
    const score = post.pendingGame.game.score;
    const winner = score.home === score.away ? null : score.home > score.away ? home : away;
    finishGame(post); return winner;
  };
  const series = (a: string, b: string, target: number, stage: string) => {
    let aw = 0; let bw = 0;
    const homePattern = target === 4 ? [true, true, false, false, false, true, true] : [true, true, false, false, true];
    while (aw < target && bw < target) {
      const homeA = homePattern[Math.min(aw + bw, homePattern.length - 1)];
      const winner = play(homeA ? a : b, homeA ? b : a, stage);
      if (winner === a) aw++; else if (winner === b) bw++;
    }
    return aw === target ? a : b;
  };
  let wildcard = ranked[3];
  let fifthWins = 0;
  for (let i = 0; i < 2; i++) {
    const winner = play(ranked[3], ranked[4], '와일드카드');
    if (winner !== ranked[4]) break;
    if (++fifthWins === 2) wildcard = ranked[4];
  }
  const semiWinner = series(ranked[2], wildcard, 3, '준플레이오프');
  const playoffWinner = series(ranked[1], semiWinner, 3, '플레이오프');
  return { champion: series(ranked[0], playoffWinner, 4, '한국시리즈'), games: post.league.results };
}
export function resolveHighlight(original: CareerSave, paId: string, result?: PAResult, miniRngState?: number, pitches?: number): CareerSave {
  if (!['HIGHLIGHT_READY', 'MINI_GAME'].includes(original.phase) || !original.pendingGame || pendingPaId(original) !== paId) return original;
  const save = structuredClone(original); const rng = new Rng(miniRngState ?? save.rngState);
  const match = currentMatch(save.pendingGame!);
  const batter = save.players.find(p => p.id === match.batterId)!; const pitcher = save.players.find(p => p.id === match.pitcherId)!;
  const outcome = result ?? sampleAutoPA(batter.skills, pitcher.skills, rng); const before = { ...save.pendingGame!.game.score };
  commitPA(save, outcome, rng, pitches);
  save.lastHighlight = { result: outcome, before, after: { ...save.pendingGame!.game.score }, paId };
  save.rngState = rng.state; save.phase = 'SIMULATING'; return save;
}
export function nextSeason(save: CareerSave): CareerSave {
  if (save.phase !== 'SEASON_RESULT') return save;
  if (isYouth(save)) return nextSchoolYear(save);
  if (save.player.age >= 38) return { ...save, phase: 'RETIRED' };
  const rng = new Rng(save.rngState); const player = structuredClone(save.player);
  const growth = player.age < 25 ? rng.int(1, 3) : player.age < 30 ? rng.int(0, 2) : player.age < 33 ? rng.int(-1, 1) : -rng.int(1, 3);
  const capped = growth > 0 ? Math.max(0, Math.min(growth, player.potential - overall(player))) : growth;
  for (const key of Object.keys(player.skills)) player.skills[key] = Math.max(1, Math.min(99, player.skills[key] + capped));
  player.age++; player.fatigue = 0; player.minorGames = 0;
  player.health = Math.min(100, player.health + 15); player.injuredUntil = 0;
  player.contractYearsLeft = Math.max(1, (player.contractYearsLeft ?? 1) - 1);
  const contractHistory = [...save.contractHistory];
  if (save.contractOffers.length) { player.salaryCR = 3000; player.contractYearsLeft = 1; contractHistory.push({ teamId: player.teamId, salaryCR: 3000, years: 1, year: save.year + 1, opportunity: player.role === 'HITTER' ? 'BENCH' : 'STARTER' }); }
  if (player.rosterStatus === 'INJURED') player.rosterStatus = player.role === 'HITTER' ? 'BENCH' : 'STARTER';
  const recentH = save.league.hitters[player.id]; const recentP = save.league.pitchers[player.id];
  const struggled = recentH ? recentH.ab >= 60 && recentH.h / recentH.ab < .18 : recentP ? recentP.outs >= 60 && recentP.er * 27 / recentP.outs > 7 : false;
  if (overall(player) < 43 && struggled && player.rosterStatus !== 'STARTER') player.rosterStatus = 'MINORS';
  const players = save.players.map(p => {
    if (p.id === player.id) return player;
    // Keep a fictional league alive across a full career with age progression and new rookies.
    if (p.age >= 38) return { ...p, age: 18, skills: Object.fromEntries(Object.keys(p.skills).map(k => [k, rng.int(40, 65)])), potential: rng.int(65, 95) };
    const change = p.age < 25 ? rng.int(0, 2) : p.age < 30 ? rng.int(0, 1) : -rng.int(0, 2);
    return { ...p, age: p.age + 1, skills: Object.fromEntries(Object.entries(p.skills).map(([k, v]) => [k, Math.max(1, Math.min(99, v + change))])) };
  });
  const missingTeams = TEAMS.filter(t => !players.some(p => p.teamId === t.id));
  players.push(...createRoster(missingTeams, rng));
  return { ...save, year: save.year + 1, player, players, trained: false, phase: 'PRESEASON', rngState: rng.state, league: emptyLeague(players), schedule: createSchedule(TEAMS.map(t => t.id), rng.state), pendingGame: null, highlightCount: 0, lastHighlight: null, pendingEvent: null, eventsThisSeason: 0, contractOffers: [], awards: [], postseason: null, contractHistory };
}
export function retire(save: CareerSave): CareerSave { return save.phase === 'SEASON_RESULT' && save.player.age >= 35 ? { ...save, phase: 'RETIRED', contractOffers: [] } : save; }
function simulateSchoolCups(save: CareerSave, rng: Rng): SchoolCup[] {
  const players = Object.fromEntries(save.players.map(p => [p.id, p]));
  const cups: SchoolCup[] = [];
  for (const name of ['이마트배', '황금사자기', '청룡기', '봉황대기']) {
    const post = { ...save, league: emptyLeague(save.players), pendingGame: null } as CareerSave;
    let entrants = save.league.standings.map(t => t.teamId);
    for (let i = entrants.length - 1; i > 0; i--) { const j = rng.int(0, i); [entrants[i], entrants[j]] = [entrants[j], entrants[i]]; }
    let count = 0;
    while (entrants.length > 1) {
      const winners: string[] = [];
      for (let i = 0; i < entrants.length; i += 2) {
        if (!entrants[i + 1]) { winners.push(entrants[i]); continue; }
        let winner: string | null = null;
        while (!winner) {
          if (++count > 500) throw new Error('전국대회 진행에 실패했습니다. 마지막 저장부터 재개해 주세요.');
          const fixture = { id: name + '-' + count, round: 20 + count, homeTeamId: entrants[i], awayTeamId: entrants[i + 1] };
          post.pendingGame = startGame(fixture, post);
          while (post.pendingGame.game.status !== 'FINAL') {
            if (post.pendingGame.pa > 5000) throw new Error('전국대회 경기 상한을 초과했습니다.');
            prepare(post); const match = currentMatch(post.pendingGame);
            commitPA(post, sampleAutoPA(players[match.batterId].skills, players[match.pitcherId].skills, rng), rng);
          }
          const score = post.pendingGame.game.score;
          if (score.home !== score.away) winner = score.home > score.away ? fixture.homeTeamId : fixture.awayTeamId;
          finishGame(post);
        }
        winners.push(winner);
      }
      entrants = winners;
    }
    cups.push({ name, champion: entrants[0], games: post.league.results, hitter: post.league.hitters[save.player.id] ? { ...post.league.hitters[save.player.id] } : null, pitcher: post.league.pitchers[save.player.id] ? { ...post.league.pitchers[save.player.id] } : null });
  }
  return cups;
}
