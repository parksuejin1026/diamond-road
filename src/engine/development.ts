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
  if (save.phase !== 'PRESEASON' || !(skill in save.player.skills)) return save;
  return { ...save, focusSkill: skill, youth: save.youth ? { ...save.youth, focus: skill } : save.youth };
}
// Called once at the season boundary. Uses the saved RNG so reloads cannot reroll growth.
export function developPlayer(save: CareerSave, rng: Rng) {
  if (save.development?.year === save.year) return;
  const beforeSkills = { ...save.player.skills }; const beforeOvr = overall(save.player);
  const focus = focusSkill(save); const age = save.player.age;
  const room = Math.max(0, save.player.potential - beforeOvr);
  for (const key of Object.keys(beforeSkills)) {
    const random = age < 25 ? rng.int(0, 3) : age < 30 ? rng.int(0, 2) : age < 33 ? rng.int(-1, 1) : rng.int(-3, 0);
    const gain = random + (key === focus ? 1 : 0);
    const change = gain > 0 ? Math.min(gain, room) : gain;
    save.player.skills[key] = Math.max(1, Math.min(99, beforeSkills[key] + change));
  }
  save.players = save.players.map(p => p.id === save.player.id ? save.player : p);
  save.development = { year: save.year, focus, beforeSkills, afterSkills: { ...save.player.skills }, beforeOvr, afterOvr: overall(save.player) };
}
