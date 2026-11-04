import type { CareerSave } from './career';
import { overall, hitterRates, pitcherRates } from '../domain/calculators';
import { TEAMS } from './schedule';
import { Rng } from './rng';
export interface Contract { teamId: string; salaryCR: number; years: number; year: number; opportunity: 'STARTER' | 'BENCH'; kind?: 'DRAFT' | 'RENEWAL' | 'FA'; signingBonusCR?: number; negotiated?: boolean; }
export interface ContractService { days: number; faUses: number; lastFADays: number; activeRounds: number; countedYear?: number; }
export function contractService(save: CareerSave): ContractService {
  return save.contractService ?? { days: save.seasons.filter(s => (s.hitter?.g ?? s.pitcher?.g ?? 0) > 0).length * 145, faUses: 0, lastFADays: 0, activeRounds: save.league.round, countedYear: save.seasons.at(-1)?.year };
}
export function faProgress(save: CareerSave) {
  const service = contractService(save); const required = service.faUses ? 4 * 145 : 8 * 145;
  const earned = Math.max(0, service.days - service.lastFADays);
  return { earned, required, eligible: earned >= required && (save.player.contractYearsLeft ?? 1) <= 1 };
}
export function recordContractRound(save: CareerSave) {
  if (save.youth && !save.youth.graduated) return;
  const service = { ...contractService(save) };
  // league.round has already advanced; legacy saves estimate only the earlier rounds.
  if (!save.contractService) service.activeRounds = Math.max(0, save.league.round - 1);
  if (!['MINORS', 'INJURED'].includes(save.player.rosterStatus ?? 'BENCH')) service.activeRounds++;
  save.contractService = service;
}
export function finishContractYear(save: CareerSave) {
  if (save.youth && !save.youth.graduated) return;
  const service = { ...contractService(save) };
  if (service.countedYear === save.year) return;
  const rounds = Math.max(...save.schedule.map(g => g.round));
  service.days += Math.floor(Math.min(rounds, service.activeRounds) * 145 / rounds);
  service.countedYear = save.year; save.contractService = service;
}
export function createOffers(save: CareerSave, rng: Rng): Contract[] {
  const rating = overall(save.player);
  const hitter = save.league.hitters[save.player.id]; const pitcher = save.league.pitchers[save.player.id];
  const performance = hitter && hitter.pa >= 50 ? Math.max(-.15, Math.min(.25, (hitterRates(hitter).ops - .7) * .35)) : pitcher && pitcher.outs >= 60 ? Math.max(-.2, Math.min(.25, (4.5 - (pitcherRates(pitcher).era ?? 4.5)) * .06)) : -.1;
  const base = Math.max(3000, Math.round((2000 + rating * 70 + (save.player.reputation ?? 0) * 30) * (1 + performance) / 100) * 100);
  if ((save.player.contractYearsLeft ?? 1) > 1) return [];
  if (!faProgress(save).eligible) return [{ teamId: save.player.teamId, salaryCR: base, years: 1, year: save.year + 1, opportunity: rating >= 60 ? 'STARTER' : 'BENCH', kind: 'RENEWAL', signingBonusCR: 0 }];
  const others = TEAMS.filter(t => t.id !== save.player.teamId && save.players.some(p => p.teamId === t.id));
  if (others.length < 2) return [{ teamId: save.player.teamId, salaryCR: base, years: 1, year: save.year + 1, opportunity: rating >= 60 ? 'STARTER' : 'BENCH', kind: 'RENEWAL', signingBonusCR: 0 }];
  const first = rng.int(0, others.length - 1); const second = (first + rng.int(1, others.length - 1)) % others.length;
  const offers: Contract[] = [save.player.teamId, others[first].id, others[second].id].map((teamId, i) => ({ teamId, salaryCR: Math.round(base * (i === 1 ? 1.3 : i === 2 ? .85 : 1) / 100) * 100, years: i === 1 ? 3 : i === 2 ? 1 : 2, year: save.year + 1, opportunity: i === 2 || rating >= 60 ? 'STARTER' : 'BENCH', kind: 'FA', signingBonusCR: Math.round(base * (i === 1 ? 2 : 1)) }));
  offers.push({ teamId: save.player.teamId, salaryCR: base, years: 1, year: save.year + 1, opportunity: rating >= 60 ? 'STARTER' : 'BENCH', kind: 'RENEWAL', signingBonusCR: 0 });
  return offers;
}
export function negotiateSalary(original: CareerSave, index: number): CareerSave {
  const offer = original.contractOffers[index];
  if (original.phase !== 'SEASON_RESULT' || !offer || offer.negotiated) return original;
  const save = structuredClone(original);
  const bonus = Math.min(.15, .03 + Math.max(0, save.player.reputation ?? 0) * .001);
  save.contractOffers[index].salaryCR = Math.ceil(offer.salaryCR * (1 + bonus) / 100) * 100;
  save.contractOffers[index].negotiated = true; return save;
}
export function signContract(original: CareerSave, index: number): CareerSave {
  if (original.phase !== 'SEASON_RESULT' || !original.contractOffers[index]) return original;
  const save = structuredClone(original); const offer = save.contractOffers[index];
  if (offer.kind === 'FA' && !faProgress(save).eligible) return original;
  if (offer.kind === 'RENEWAL' && offer.teamId !== save.player.teamId) return original;
  const oldTeam = save.player.teamId;
  if (offer.teamId !== oldTeam) {
    const replacement = save.players.find(p => p.teamId === offer.teamId && p.role === save.player.role && p.id !== save.player.id);
    if (!replacement) return original;
    replacement.teamId = oldTeam;
    // Swap roster positions as well, keeping nine hitters and a bench / five starters.
    const userIndex = save.players.findIndex(p => p.id === save.player.id);
    const otherIndex = save.players.findIndex(p => p.id === replacement.id);
    [save.players[userIndex], save.players[otherIndex]] = [save.players[otherIndex], save.players[userIndex]];
  }
  save.player.teamId = offer.teamId; save.player.salaryCR = offer.salaryCR; save.player.contractYearsLeft = offer.years + 1;
  save.player.rosterStatus = offer.opportunity; save.contractHistory.push(offer); save.contractOffers = [];
  if (offer.kind === 'FA') { const service = contractService(save); save.contractService = { ...service, faUses: service.faUses + 1, lastFADays: service.days }; }
  save.players = save.players.map(p => p.id === save.player.id ? save.player : p);
  return save;
}
