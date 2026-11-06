import universities from '../data/universities.json' with { type: 'json' };
import data from '../data/schools.json' with { type: 'json' };
import type { ScheduleGame } from '../domain/types';
import { Rng } from './rng';
export const SCHOOLS = data.teams;
export const SCHOOL_SOURCE = data.source;
export const YOUTH_ROUNDS = 14;
export function schoolGroups(seed: number): string[][] {
  const rng = new Rng(seed);
  const schools = [...SCHOOLS].sort((a, b) => a.region.localeCompare(b.region) || a.id.localeCompare(b.id));
  return Array.from({ length: 13 }, (_, i) => {
    const group = schools.slice(i * 8, (i + 1) * 8).map(s => s.id);
    for (let j = group.length - 1; j > 0; j--) { const k = rng.int(0, j); [group[j], group[k]] = [group[k], group[j]]; }
    return group;
  });
}
export function createSchoolSchedule(seed: number): ScheduleGame[] {
  return schoolGroups(seed).flatMap((ring, group) => {
    const games: ScheduleGame[] = [];
    for (let r = 0; r < 7; r++) {
      for (let i = 0; i < 4; i++) for (let leg = 0; leg < 2; leg++) games.push({ id: `school-${group}-${r}-${i}-${leg}`, round: r + 1 + leg * 7, homeTeamId: ring[leg ? 7 - i : i], awayTeamId: ring[leg ? i : 7 - i] });
      ring.splice(1, 0, ring.pop()!);
    }
    return games;
  }).sort((a, b) => a.round - b.round || a.id.localeCompare(b.id));
}

export const UNIVERSITIES = universities.teams;
// Four-year university route; competition groups and admissions are simplified for the game.
export function createUniversitySchedule(seed: number): ScheduleGame[] {
  const rng = new Rng(seed), ids: (string | null)[] = UNIVERSITIES.map(t => t.id);
  for (let i=ids.length-1;i>0;i--) { const j=rng.int(0,i); [ids[i],ids[j]]=[ids[j],ids[i]]; }
  if(ids.length%2)ids.push(null);
  const games: ScheduleGame[]=[];
  for(let r=0;r<14;r++) {
    for(let i=0;i<ids.length/2;i++) {
      const a=ids[i],b=ids[ids.length-1-i];
      if(a&&b)games.push({id:`university-${r}-${i}`,round:r+1,homeTeamId:r%2?a:b,awayTeamId:r%2?b:a});
    }
    ids.splice(1,0,ids.pop()!);
  }
  return games;
}
