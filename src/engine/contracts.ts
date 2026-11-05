import { credit, life } from './life';
import type { CareerSave } from './career';
import { overall, hitterRates, pitcherRates } from '../domain/calculators';
import { TEAMS } from './schedule';
import { Rng } from './rng';
export interface PerformanceOption { metric: 'HITS' | 'STRIKEOUTS'; target: number; bonusCR: number; }
export interface Contract { teamId: string; salaryCR: number; years: number; year: number; opportunity: 'STARTER' | 'BENCH'; kind?: 'DRAFT' | 'RENEWAL' | 'FA' | 'EXTENSION' | 'RELEASE' | 'TRADE'; signingBonusCR?: number; negotiated?: boolean; option?: PerformanceOption; }
export interface ContractSettlement { year: number; teamId: string; salaryCR: number; signingBonusCR: number; optionBonusCR: number; optionAchieved: boolean; }
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
  if (save.player.rosterStatus !== 'MINORS') service.activeRounds++;
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
  const option: PerformanceOption = { metric: save.player.role === 'HITTER' ? 'HITS' : 'STRIKEOUTS', target: save.player.role === 'HITTER' ? 120 : 100, bonusCR: Math.round(base * .15 / 100) * 100 };
  if (!faProgress(save).eligible) {
    const lowCurrent = hitter ? hitter.pa < 50 : (pitcher?.outs ?? 0) < 90;
    const last = save.seasons.at(-1); const lowPrevious = last && (last.hitter ? last.hitter.pa < 50 : (last.pitcher?.outs ?? 0) < 90);
    if (save.player.age >= 23 && rating < 48 && lowCurrent && lowPrevious) {
      return TEAMS.filter(team => team.id !== save.player.teamId && save.players.some(player => player.teamId === team.id)).slice(0, 2).map(team => ({ teamId: team.id, salaryCR: Math.max(3000, Math.round(base * .75 / 100) * 100), years: 1, year: save.year + 1, opportunity: 'BENCH' as const, kind: 'RELEASE' as const, signingBonusCR: 0 }));
    }
    const offers: Contract[] = [{ teamId: save.player.teamId, salaryCR: base, years: 1, year: save.year + 1, opportunity: rating >= 60 ? 'STARTER' : 'BENCH', kind: 'RENEWAL', signingBonusCR: 0, option }];
    if (rating >= 70 && save.seasons.length >= 2) offers.push({ teamId: save.player.teamId, salaryCR: Math.round(base * .95 / 100) * 100, years: 3, year: save.year + 1, opportunity: 'STARTER', kind: 'EXTENSION', signingBonusCR: Math.round(base * .5), option });
    return offers;
  }
  const others = TEAMS.filter(t => t.id !== save.player.teamId && save.players.some(p => p.teamId === t.id));
  if (others.length < 2) return [{ teamId: save.player.teamId, salaryCR: base, years: 1, year: save.year + 1, opportunity: rating >= 60 ? 'STARTER' : 'BENCH', kind: 'RENEWAL', signingBonusCR: 0 }];
  const first = rng.int(0, others.length - 1); const second = (first + rng.int(1, others.length - 1)) % others.length;
  const offers: Contract[] = [save.player.teamId, others[first].id, others[second].id].map((teamId, i) => ({ teamId, salaryCR: Math.round(base * (i === 1 ? 1.3 : i === 2 ? .85 : 1) / 100) * 100, years: i === 1 ? 3 : i === 2 ? 1 : 2, year: save.year + 1, opportunity: i === 2 || rating >= 60 ? 'STARTER' : 'BENCH', kind: 'FA', signingBonusCR: Math.round(base * (i === 1 ? 2 : 1)), option }));
  offers.push({ teamId: save.player.teamId, salaryCR: base, years: 1, year: save.year + 1, opportunity: rating >= 60 ? 'STARTER' : 'BENCH', kind: 'RENEWAL', signingBonusCR: 0 });
  return offers;
}
export function settleContractYear(save: CareerSave) {
  if (save.contractSettlements?.some(settlement => settlement.year === save.year)) return;
  const active = save.contractHistory.filter(contract => contract.year <= save.year && contract.year + contract.years > save.year).at(-1);
  const option = active?.option;
  const count = option?.metric === 'HITS' ? save.league.hitters[save.player.id]?.h ?? 0 : save.league.pitchers[save.player.id]?.so ?? 0;
  const optionAchieved = !!option && count >= option.target;
  const paid=life(save).ledger.filter(r=>r.id.startsWith(`salary-${save.year}-`)).reduce((n,r)=>n+r.amount,0);
  credit(save,`salary-final-${save.year}`,Math.max(0,save.player.salaryCR*10000-paid),'연봉 잔액 정산');
  credit(save,`option-${save.year}`,optionAchieved?option!.bonusCR*10000:0,'성적 옵션 정산');
  save.contractSettlements = [...(save.contractSettlements ?? []), { year: save.year, teamId: save.player.teamId, salaryCR: save.player.salaryCR, signingBonusCR: active?.year === save.year ? active.signingBonusCR ?? 0 : 0, optionBonusCR: optionAchieved ? option!.bonusCR : 0, optionAchieved }];
}
export function proposeTrade(save: CareerSave, rng: Rng) {
  if ((save.player.contractYearsLeft ?? 1) <= 1 || overall(save.player) < 55) return;
  const wins = save.league.standings.find(team => team.teamId === save.player.teamId)?.w ?? 0;
  const struggling = save.league.standings.filter(team => team.w > wins).length >= 6 || save.player.rosterStatus === 'MINORS';
  if (!struggling || rng.next() >= .35) return;
  const others = TEAMS.filter(team => team.id !== save.player.teamId && save.players.some(player => player.teamId === team.id));
  if (!others.length) return;
  const active = save.contractHistory.filter(contract => contract.year <= save.year).at(-1);
  save.pendingTrade = { teamId: others[rng.int(0, others.length - 1)].id, year: save.year + 1, salaryCR: save.player.salaryCR, years: Math.max(1, save.player.contractYearsLeft! - 1), opportunity: save.player.rosterStatus === 'STARTER' ? 'STARTER' : 'BENCH', kind: 'TRADE', signingBonusCR: 0, option: active?.option };
}
export function resolveTrade(save: CareerSave, accept: boolean): CareerSave {
  if (save.phase !== 'SEASON_RESULT' || !save.pendingTrade) return save;
  if (!accept) return { ...save, pendingTrade: null };
  const offered = { ...save, contractOffers: [save.pendingTrade] };
  const signed = signContract(offered, 0);
  if (signed === offered) return save;
  return { ...signed, pendingTrade: null, player: { ...signed.player, contractYearsLeft: save.player.contractYearsLeft }, players: signed.players.map(player => player.id === save.player.id ? { ...signed.player, contractYearsLeft: save.player.contractYearsLeft } : player) };
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
  if(offer.signingBonusCR)credit(save,`signing-${offer.year}-${offer.teamId}`,offer.signingBonusCR*10000,'계약금');
  if(offer.kind==='FA'&&offer.teamId!==oldTeam){
    const tenure=save.seasons.filter(s=>s.teamId===oldTeam).length;
    life(save).news.push({year:save.year,text:tenure>=5?'오랜 소속을 떠나는 FA 이적에 친정 팬들의 야유가 쏟아집니다. 새로운 유니폼에서 증명할 시간입니다.':'새 구단에서 새로운 도전을 시작합니다.'});
    if(tenure>=5)life(save).mentality=Math.max(20,life(save).mentality-8);
  }
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
