import type { CareerSave } from './career';
import { overall } from '../domain/calculators';
import { TEAMS } from './schedule';
import { Rng } from './rng';
export interface Contract { teamId: string; salaryCR: number; years: number; year: number; opportunity: 'STARTER' | 'BENCH'; }
export function createOffers(save: CareerSave, rng: Rng): Contract[] {
  const rating = overall(save.player); const base = Math.round((2000 + rating * 70 + (save.player.reputation ?? 0) * 30) / 100) * 100;
  const others = TEAMS.filter(t => t.id !== save.player.teamId && save.players.some(p => p.teamId === t.id));
  const first = rng.int(0, others.length - 1); const second = (first + rng.int(1, others.length - 1)) % others.length;
  return [save.player.teamId, others[first].id, others[second].id].map((teamId, i) => ({ teamId, salaryCR: Math.round(base * (i === 1 ? 1.3 : i === 2 ? .85 : 1) / 100) * 100, years: i === 1 ? 3 : i === 2 ? 1 : 2, year: save.year + 1, opportunity: i === 2 || rating >= 60 || save.player.role === 'PITCHER' ? 'STARTER' : 'BENCH' }));
}
export function signContract(original: CareerSave, index: number): CareerSave {
  if (original.phase !== 'SEASON_RESULT' || !original.contractOffers[index]) return original;
  const save = structuredClone(original); const offer = save.contractOffers[index];
  const oldTeam = save.player.teamId;
  if (offer.teamId !== oldTeam) {
    const replacement = save.players.find(p => p.teamId === offer.teamId && p.role === save.player.role && p.id !== save.player.id)!;
    replacement.teamId = oldTeam;
    // Swap roster positions as well, keeping nine hitters and a bench / five starters.
    const userIndex = save.players.findIndex(p => p.id === save.player.id);
    const otherIndex = save.players.findIndex(p => p.id === replacement.id);
    [save.players[userIndex], save.players[otherIndex]] = [save.players[otherIndex], save.players[userIndex]];
  }
  save.player.teamId = offer.teamId; save.player.salaryCR = offer.salaryCR; save.player.contractYearsLeft = offer.years + 1;
  save.player.rosterStatus = offer.opportunity; save.contractHistory.push(offer); save.contractOffers = [];
  save.players = save.players.map(p => p.id === save.player.id ? save.player : p);
  return save;
}
