import type { Player, Role, Skills } from '../domain/types';
import { Rng } from './rng';
export const PLAYER_STYLES: Record<Role, { name: string; description: string; skills: Skills }[]> = {
  HITTER: [
    { name: '정교한 타격', description: '컨택 · 선구안 중심', skills: { contact: 52, power: 38, eye: 48, speed: 45, defense: 40, mental: 42 } },
    { name: '장타자의 꿈', description: '파워 · 한 방의 가능성', skills: { contact: 42, power: 56, eye: 38, speed: 38, defense: 42, mental: 45 } },
    { name: '그라운드의 발', description: '주력 · 수비 중심', skills: { contact: 45, power: 42, eye: 42, speed: 56, defense: 48, mental: 42 } },
  ],
  PITCHER: [
    { name: '강속구의 꿈', description: '구속 · 정면 승부', skills: { velocity: 54, control: 40, breaking: 42, stamina: 45, mental: 42 } },
    { name: '정밀한 제구', description: '제구 · 안정적인 승부', skills: { velocity: 38, control: 54, breaking: 44, stamina: 42, mental: 45 } },
    { name: '변화구 마스터', description: '변화구 · 타이밍 싸움', skills: { velocity: 43, control: 40, breaking: 54, stamina: 44, mental: 42 } },
  ],
};
export function makePlayer(id: string, name: string, role: Role, teamId: string, rng: Rng, youth = false): Player {
  return { id, name, role, teamId, age: rng.int(youth ? 16 : 20, youth ? 18 : 35), hand: 'RIGHT', skills: Object.fromEntries((role === 'HITTER' ? ['contact', 'power', 'eye', 'speed', 'defense', 'mental'] : ['velocity', 'control', 'breaking', 'stamina', 'mental']).map(k => [k, rng.int(youth ? 30 : 40, youth ? 65 : 85)])), potential: rng.int(65, 95), health: 100, fatigue: 0, salaryCR: youth ? 0 : 3000 };
}
export function createRoster(teams: { id: string; name: string }[], rng: Rng, youth = false): Player[] {
  const families = ['김', '이', '박', '최', '정', '강', '윤', '한'];
  const names = ['도겸', '지완', '하준', '서율', '태린', '건우', '시헌', '은찬', '주안', '유건', '도원', '재율', '우겸', '서한', '이준', '준영', '민후', '태윤'];
  return teams.flatMap(team => Array.from({ length: 18 }, (_, i) => makePlayer(team.id + '-' + i, families[rng.int(0, families.length - 1)] + names[i], i < 10 ? 'HITTER' : 'PITCHER', team.id, rng, youth)));
}
