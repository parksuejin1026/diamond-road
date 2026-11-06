import type { Player, Role, Skills } from '../domain/types';
import { Rng } from './rng';
export {PLAYER_STYLES} from './playStyles';
export function makePlayer(id: string, name: string, role: Role, teamId: string, rng: Rng, youth = false): Player {
  return { id, name, role, teamId, age: rng.int(youth ? 16 : 20, youth ? 18 : 35), hand: 'RIGHT', position: role==='HITTER'?(['C','1B','2B','3B','SS','LF','CF','RF','DH','DH'] as const)[Number(id.split('-').at(-1))%10]:undefined, skills: Object.fromEntries((role === 'HITTER' ? ['contact', 'power', 'eye', 'speed', 'defense', 'mental'] : ['velocity', 'control', 'breaking', 'stamina', 'mental']).map(k => [k, rng.int(youth ? 30 : 40, youth ? 65 : 85)])), potential: rng.int(65, 95), health: 100, fatigue: 0, salaryCR: youth ? 0 : 3000 };
}
export function createRoster(teams: { id: string; name: string }[], rng: Rng, youth = false): Player[] {
  const families = ['김', '이', '박', '최', '정', '강', '윤', '한'];
  const names = ['도겸', '지완', '하준', '서율', '태린', '건우', '시헌', '은찬', '주안', '유건', '도원', '재율', '우겸', '서한', '이준', '준영', '민후', '태윤'];
  return teams.flatMap(team => Array.from({ length: 18 }, (_, i) => makePlayer(team.id + '-' + i, families[rng.int(0, families.length - 1)] + names[i], i < 10 ? 'HITTER' : 'PITCHER', team.id, rng, youth)));
}
