import type { CareerSave } from './career';
import type { HitterStats, PitcherStats, Skills } from '../domain/types';
import { overall, hitterRates, pitcherRates } from '../domain/calculators';
import { Rng } from './rng';
import { SCHOOLS, createSchoolSchedule } from './schools';
import { TEAMS, createSchedule } from './schedule';
import { createRoster } from './roster';
import { emptyLeague, type GameResult } from './season';
export interface SchoolCup { name: string; champion: string; games: GameResult[]; hitter: HitterStats | null; pitcher: PitcherStats | null; }
export interface SchoolYear { year: number; age: number; grade: number; hitter: HitterStats | null; pitcher: PitcherStats | null; beforeOvr: number; afterOvr: number; beforeSkills: Skills; afterSkills: Skills; cups: { name: string; champion: string }[]; }
export interface DraftResult { teamId: string; round: number | null; overallPick: number | null; score: number; signingBonusCR: number; salaryCR: number; }
export interface YouthCareer { schoolId: string; grade: number; preferredTeamId: string; focus: string; trust: number; history: SchoolYear[]; draft: DraftResult | null; graduated: boolean; yearStartSkills: Skills; cups?: SchoolCup[]; }
export const isYouth = (save: CareerSave) => !!save.youth && !save.youth.graduated;
export const teamName = (id: string) => TEAMS.find(t => t.id === id)?.name ?? SCHOOLS.find(s => s.id === id)?.name ?? id;
export const seasonRounds = (save: CareerSave) => Math.max(...save.schedule.map(g => g.round));
export function finishSchoolYear(save: CareerSave, rng: Rng, cups: SchoolCup[]) {
  const youth = save.youth!; const beforeSkills = { ...youth.yearStartSkills };
  const beforeOvr = overall({ ...save.player, skills: beforeSkills });
  const h = save.league.hitters[save.player.id] ? { ...save.league.hitters[save.player.id] } : null; const p = save.league.pitchers[save.player.id] ? { ...save.league.pitchers[save.player.id] } : null;
  for (const cup of cups) {
    if (h && cup.hitter) for (const k of Object.keys(h) as (keyof HitterStats)[]) h[k] = (h[k] ?? 0) + (cup.hitter[k] ?? 0);
    if (p && cup.pitcher) for (const k of Object.keys(p) as (keyof PitcherStats)[]) p[k] += cup.pitcher[k];
  }
  const appearances = h ? h.pa : p ? p.outs : 0;
  const growth = Math.max(2, Math.min(rng.int(4, 7) + (appearances > 30 ? 1 : 0), save.player.potential - overall(save.player)));
  for (const key of Object.keys(save.player.skills)) save.player.skills[key] = Math.min(99, save.player.skills[key] + growth + (key === youth.focus ? 2 : 0));
  save.players = save.players.map(p => p.id === save.player.id ? save.player : p);
  youth.cups = cups;
  youth.history.push({ year: save.year, age: save.player.age, grade: youth.grade, hitter: h ? { ...h } : null, pitcher: p ? { ...p } : null, beforeOvr, afterOvr: overall(save.player), beforeSkills, afterSkills: { ...save.player.skills }, cups: cups.map(c => ({ name: c.name, champion: c.champion })) });
  if (youth.grade === 3) youth.draft = scoutDraft(save, rng);
  save.phase = 'SEASON_RESULT';
}
function scoutDraft(save: CareerSave, rng: Rng): DraftResult {
  const h = save.youth!.history.at(-1)?.hitter; const p = save.youth!.history.at(-1)?.pitcher;
  const performance = h ? (hitterRates(h).ops - .7) * 10 : p ? (4.5 - (pitcherRates(p).era ?? 4.5)) * 1.5 : 0;
  const titles = save.youth!.history.flatMap(y => y.cups).filter(c => c.champion === save.youth!.schoolId).length;
  const score = Math.round(overall(save.player) + performance + titles * 2 + rng.int(-3, 3));
  const round = score < 48 ? null : Math.max(1, Math.min(11, Math.ceil((82 - score) / 4)));
  const pick = round ? (round - 1) * 10 + rng.int(1, 10) : null;
  const team = rng.next() < .2 ? save.youth!.preferredTeamId : TEAMS[rng.int(0, TEAMS.length - 1)].id;
  return { teamId: team, round, overallPick: pick, score, signingBonusCR: round ? Math.max(1000, (12 - round) * 3000) : 0, salaryCR: round && round <= 3 ? 5000 : 3000 };
}
export function nextSchoolYear(original: CareerSave): CareerSave {
  if (!isYouth(original) || original.phase !== 'SEASON_RESULT') return original;
  const save = structuredClone(original); const youth = save.youth!;
  if (youth.grade === 3) { save.phase = 'DRAFT'; return save; }
  const rng = new Rng(save.rngState);
  youth.grade++; youth.trust = Math.min(100, youth.trust + 12); youth.cups = [];
  save.year++; save.player.age++; save.player.health = Math.min(100, save.player.health + 20); save.player.fatigue = 0; save.player.injuredUntil = 0;
  save.player.rosterStatus = youth.trust >= 55 ? 'STARTER' : 'BENCH';
  // New classmates keep every registered team in the school competition.
  save.players = createRoster(SCHOOLS, rng, true);
  const slot = save.players.findIndex(p => p.id === youth.schoolId + '-' + (save.player.role === 'HITTER' ? 9 : 14));
  save.players[slot] = save.player;
  save.league = emptyLeague(save.players); save.schedule = createSchoolSchedule(save.seed);
  save.phase = 'PRESEASON'; save.trained = false; save.highlightCount = 0; save.pendingGame = null; save.lastHighlight = null; save.pendingEvent = null; save.eventsThisSeason = 0;
  youth.yearStartSkills = { ...save.player.skills }; save.rngState = rng.state;
  return save;
}
export function signDraft(original: CareerSave): CareerSave {
  if (original.phase !== 'DRAFT' || !isYouth(original) || !original.youth?.draft) return original;
  const save = structuredClone(original); const youth = save.youth!; const draft = youth.draft!; const rng = new Rng(save.rngState);
  youth.graduated = true;
  save.player.teamId = draft.teamId; save.player.age = 19; save.player.salaryCR = draft.round ? draft.salaryCR : 2000; save.player.contractYearsLeft = 1;
  save.player.rosterStatus = draft.round ? save.player.role === 'HITTER' ? 'BENCH' : 'STARTER' : 'MINORS';
  save.player.health = 100; save.player.fatigue = 0; save.player.injuredUntil = 0;
  save.players = createRoster(TEAMS, rng);
  const slot = save.players.findIndex(p => p.id === draft.teamId + '-' + (save.player.role === 'HITTER' ? 9 : 14)); save.players[slot] = save.player;
  save.year++; save.schedule = createSchedule(TEAMS.map(t => t.id), rng.state); save.league = emptyLeague(save.players);
  save.phase = 'PRESEASON'; save.trained = false; save.highlightCount = 0; save.pendingGame = null; save.lastHighlight = null; save.pendingEvent = null; save.eventsThisSeason = 0; save.awards = []; save.postseason = null;
  save.contractHistory = [{ year: save.year, teamId: draft.teamId, salaryCR: save.player.salaryCR, years: 1, opportunity: save.player.role === 'HITTER' ? 'BENCH' : 'STARTER' }]; save.rngState = rng.state;
  return save;
}
