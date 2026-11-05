import { prepareLife, life } from './life';
import type { CareerSave } from './career';
import type { Skills } from '../domain/types';
import { overall } from '../domain/calculators';
import { Rng } from './rng';
export interface DevelopmentReport { year: number; focus: string; beforeSkills: Skills; afterSkills: Skills; beforeOvr: number; afterOvr: number; }
export function focusSkill(save: CareerSave) {
  const preferred = save.focusSkill ?? save.youth?.focus;
  return preferred && preferred in save.player.skills ? preferred : save.player.role === 'HITTER' ? 'contact' : 'control';
}
export function selectFocus(save: CareerSave, skill: string): CareerSave {
  if (save.life) return save;
  if (save.phase !== 'PRESEASON' || !(skill in save.player.skills)) return save;
  return { ...save, focusSkill: skill, youth: save.youth ? { ...save.youth, focus: skill } : save.youth };
}
// Called once at the season boundary. Uses the saved RNG so reloads cannot reroll growth.
export function developPlayer(save: CareerSave, rng: Rng) {
  if (save.development?.year === save.year) return;
  const beforeSkills = { ...save.player.skills }; const beforeOvr = overall(save.player);
  const focus = focusSkill(save); const age = save.player.age;
  const room = Math.max(0, save.player.potential - beforeOvr);
  prepareLife(save);
  const growth = life(save).growth!;
  for (const key of Object.keys(beforeSkills)) {
    const index=growth.skills.indexOf(key);
    const gain=index<0?0:growth.gains[index];
    const decline=age>=33?rng.int(0,2):0;
    save.player.skills[key]=Math.max(1,Math.min(99,beforeSkills[key]+Math.min(gain,room)-decline));
  }
  save.players = save.players.map(p => p.id === save.player.id ? save.player : p);
  save.development = { year: save.year, focus, beforeSkills, afterSkills: { ...save.player.skills }, beforeOvr, afterOvr: overall(save.player) };
}
