import type { Player, Role, ScheduleGame } from '../domain/types';
import { Rng } from './rng';
import { createSchedule, TEAMS } from './schedule';
import { emptyLeague, type LeagueSeason, type SeasonSnapshot, type PendingGame, type HighlightFeedback } from './season';
import type { EventRecord } from './events';
import type { Contract } from './contracts';
import type { Award } from './awards';
import { createRoster, PLAYER_STYLES } from './roster';
import { SCHOOLS, createSchoolSchedule } from './schools';
import type { YouthCareer } from './youth';
import { FIELD_POSITIONS } from './positions';
export interface CareerSave { youth?: YouthCareer | null; }
export interface CareerSave { trainingHistory?: { year: number; skill: string }[]; }
export interface CareerSave { focusSkill?: string; development?: import('./development').DevelopmentReport; }
export interface CareerSave { contractService?: import('./contracts').ContractService; }
export interface CareerSave { schemaVersion: 1; seed: number; rngState: number; player: Player; players: Player[]; schedule: ScheduleGame[]; phase: 'PRESEASON' | 'SIMULATING' | 'HIGHLIGHT_READY' | 'MINI_GAME' | 'DRAFT' | 'SEASON_RESULT' | 'RETIRED'; trained: boolean; year: number; league: LeagueSeason; seasons: SeasonSnapshot[]; pendingGame: PendingGame | null; highlightCount: number; lastHighlight: HighlightFeedback | null; pendingEvent: string | null; eventHistory: EventRecord[]; eventsThisSeason: number; contractHistory: Contract[]; contractOffers: Contract[]; awards: Award[]; postseason: { champion: string; games: import('./season').GameResult[] } | null; }
export function createCareer(config: { name: string; role: Role; teamId: string; hand: 'LEFT' | 'RIGHT'; schoolId?: string; style?: number; focus?: string; position?: import('../domain/types').FieldPosition }, seed: number): CareerSave {
  const name = config.name.trim();
  if (!name || [...name].length > 12) throw new Error('이름은 1~12자로 입력해 주세요.');
  if (!TEAMS.some(t => t.id === config.teamId) || !['HITTER', 'PITCHER'].includes(config.role) || !['LEFT', 'RIGHT'].includes(config.hand)) throw new Error('선수 설정을 확인해 주세요.');
  const rng = new Rng(seed);
  const school = config.schoolId ? SCHOOLS.find(s => s.id === config.schoolId) : null;
  if (config.schoolId && !school) throw new Error('등록된 학교·U18 야구부를 선택해 주세요.');
  const make = (id: string, playerName: string, role: Role, teamId: string, rookie: boolean): Player => ({
    id, name: playerName, role, teamId, age: rookie ? 18 : rng.int(20, 35), hand: 'RIGHT',
    skills: Object.fromEntries((role === 'HITTER' ? ['contact', 'power', 'eye', 'speed', 'defense', 'mental'] : ['velocity', 'control', 'breaking', 'stamina', 'mental']).map(key => [key, rng.int(rookie ? 35 : 40, rookie ? 55 : 85)])),
    potential: rng.int(65, 95), health: 100, fatigue: 0, salaryCR: 3000,
  });
  const teams = school ? SCHOOLS : TEAMS;
  const players = createRoster(teams, rng, !!school);
  const player = make('user', name, config.role, school?.id ?? config.teamId, true);
  player.hand = config.hand;
  if (config.position && (config.role !== 'HITTER' || !FIELD_POSITIONS.some(p => p.id === config.position))) throw new Error('타자의 수비 포지션을 확인해 주세요.');
  if (config.role === 'HITTER') player.position = config.position ?? 'DH';
  else player.pitchingRole = 'RELIEVER';
  if (config.focus && !(config.focus in player.skills)) throw new Error('역할에 맞는 집중 육성 능력치를 선택해 주세요.');
  player.reputation = 0; player.contractYearsLeft = 1; player.rosterStatus = config.role === 'HITTER' ? 'BENCH' : 'STARTER';
  if (school) { player.age = 16; player.salaryCR = 0; player.contractYearsLeft = 0; player.rosterStatus = 'BENCH'; }
  if (config.style !== undefined || school) {
    const profile = PLAYER_STYLES[config.role][config.style ?? 0]; if (!profile) throw new Error('플레이 스타일을 선택해 주세요.');
    player.skills = { ...profile.skills };
  }
  // Replace the bench hitter or fifth starter, retaining each club's 18-player roster.
  players[players.findIndex(p => p.id === `${player.teamId}-${config.role === 'HITTER' ? 9 : 14}`)] = player;
  return { focusSkill: config.focus, schemaVersion: 1, seed, rngState: rng.state, player, players, schedule: school ? createSchoolSchedule(seed) : createSchedule(TEAMS.map(t => t.id), seed), phase: 'PRESEASON', trained: false, year: 2026, league: emptyLeague(players), seasons: [], pendingGame: null, highlightCount: 0, lastHighlight: null, pendingEvent: null, eventHistory: [], eventsThisSeason: 0, contractHistory: school ? [] : [{ teamId: player.teamId, salaryCR: 3000, years: 1, year: 2026, opportunity: player.role === 'HITTER' ? 'BENCH' : 'STARTER' }], contractOffers: [], awards: [], postseason: null, youth: school ? { schoolId: school.id, grade: 1, preferredTeamId: config.teamId, focus: config.focus ?? (player.role === 'HITTER' ? 'contact' : 'control'), trust: 20, history: [], draft: null, graduated: false, yearStartSkills: { ...player.skills } } : null };
}
export function train(save: CareerSave, skill: string): CareerSave {
  if (save.phase !== 'PRESEASON' || save.trained || !(skill in save.player.skills)) return save;
  const player = { ...save.player, skills: { ...save.player.skills, [skill]: Math.min(99, save.player.skills[skill] + 2) } };
  return { ...save, trained: true, player, players: save.players.map(p => p.id === player.id ? player : p), trainingHistory: [...(save.trainingHistory ?? []), { year: save.year, skill }] };
}
