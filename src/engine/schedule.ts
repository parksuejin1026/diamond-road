import type { ScheduleGame } from '../domain/types';
import { Rng } from './rng';
export const TEAMS = [
  { id: 'lg', name: 'LG 트윈스', city: '서울', color: '#c30452' },
  { id: 'doosan', name: '두산 베어스', city: '서울', color: '#8994b8' },
  { id: 'kt', name: 'KT 위즈', city: '수원', color: '#ef3440' },
  { id: 'ssg', name: 'SSG 랜더스', city: '인천', color: '#e34551' },
  { id: 'nc', name: 'NC 다이노스', city: '창원', color: '#a6bddf' },
  { id: 'kia', name: 'KIA 타이거즈', city: '광주', color: '#ea3348' },
  { id: 'lotte', name: '롯데 자이언츠', city: '부산', color: '#6bb3ec' },
  { id: 'samsung', name: '삼성 라이온즈', city: '대구', color: '#5a9bff' },
  { id: 'hanwha', name: '한화 이글스', city: '대전', color: '#ff873a' },
  { id: 'kiwoom', name: '키움 히어로즈', city: '서울', color: '#e882a3' },
];
export const SEASON_ROUNDS = 144;
export const SEASON_GAMES = TEAMS.length * SEASON_ROUNDS / 2;
export const LEGACY_TEAM_IDS: Record<string, string> = { seoul: 'lg', busan: 'lotte', incheon: 'ssg', daegu: 'samsung', gwangju: 'kia', daejeon: 'hanwha', suwon: 'kt', gangneung: 'nc' };
export function createSchedule(teams: string[], seed: number): ScheduleGame[] {
  if (teams.length !== 10 || new Set(teams).size !== 10) throw new Error('서로 다른 10개 구단이 필요합니다.');
  const rng = new Rng(seed);
  const ring = [...teams];
  for (let i = ring.length - 1; i > 0; i--) { const j = rng.int(0, i); [ring[i], ring[j]] = [ring[j], ring[i]]; }
  const pairings: string[][][] = [];
  for (let r = 0; r < 9; r++) {
    pairings.push(Array.from({ length: 5 }, (_, i) => [ring[i], ring[9 - i]]));
    ring.splice(1, 0, ring.pop()!);
  }
  return Array.from({ length: 16 }, (_, cycle) => pairings.flatMap((pairs, r) => pairs.map(([a, b], i) => ({
    id: `r${cycle * 9 + r + 1}-g${i}`, round: cycle * 9 + r + 1,
    homeTeamId: cycle % 2 ? b : a, awayTeamId: cycle % 2 ? a : b,
  })))).flat();
}
