import { expect, it } from 'vitest';
import { createCareer } from '../engine/career';
import { createOffers, faProgress, finishContractYear, negotiateSalary, recordContractRound, signContract } from '../engine/contracts';
import { nextSeason } from '../engine/season';
import { SCHOOLS } from '../engine/schools';
import { Rng } from '../engine/rng';
const create = () => createCareer({ name: '계약 선수', role: 'HITTER', teamId: 'lg', hand: 'RIGHT' }, 17);
it('FA 전에는 타 구단 제안 없이 1년 연봉 재계약을 한다', () => {
  const save = create(); save.phase = 'SEASON_RESULT';
  save.contractOffers = createOffers(save, new Rng(2));
  expect(save.contractOffers).toHaveLength(1);
  expect(save.contractOffers[0]).toMatchObject({ teamId: 'lg', years: 1, kind: 'RENEWAL' });
  const offered = save.contractOffers[0].salaryCR;
  const next = nextSeason(save);
  expect(next.player.salaryCR).toBe(offered); expect(next.player.teamId).toBe('lg');
  expect(next.contractHistory).toHaveLength(save.contractHistory.length + 1);
  expect(nextSeason(next)).toBe(next);
});
it('등록 기간은 1군 라운드만 적립하고 시즌 말에 한 번만 환산한다', () => {
  const save = create(); save.league.round = 1; recordContractRound(save);
  expect(save.contractService?.activeRounds).toBe(1);
  save.player.rosterStatus = 'MINORS'; save.league.round = 2; recordContractRound(save);
  expect(save.contractService?.activeRounds).toBe(1);
  save.contractService!.activeRounds = 144; finishContractYear(save);
  expect(save.contractService?.days).toBe(145); finishContractYear(save);
  expect(save.contractService?.days).toBe(145);
  const youth = createCareer({ name: '고교', role: 'HITTER', teamId: 'lg', hand: 'RIGHT', schoolId: SCHOOLS[0].id }, 1);
  recordContractRound(youth); finishContractYear(youth); expect(youth.contractService).toBeUndefined();
});
it('FA는 첫 8시즌 환산 후 열리고 행사 후에는 4시즌과 계약 만료를 기다린다', () => {
  const save = create(); save.phase = 'SEASON_RESULT';
  save.contractService = { days: 1159, activeRounds: 0, faUses: 0, lastFADays: 0 };
  expect(faProgress(save).eligible).toBe(false);
  save.contractService.days = 1160;
  save.contractOffers = createOffers(save, new Rng(2));
  expect(save.contractOffers).toHaveLength(4);
  const moved = signContract(save, 1);
  expect(moved.player.teamId).not.toBe('lg'); expect(moved.contractService?.faUses).toBe(1);
  expect(faProgress(moved).eligible).toBe(false);
  moved.contractService!.days += 580;
  expect(faProgress(moved).eligible).toBe(false);
  moved.player.contractYearsLeft = 1; expect(faProgress(moved).eligible).toBe(true);
  const deferred = signContract(save, 3);
  expect(deferred.player.teamId).toBe('lg'); expect(deferred.contractService?.faUses).toBe(0);
  expect(faProgress(nextSeason(deferred)).eligible).toBe(true);
});
it('다년계약 중에는 제안을 만들지 않고 연봉과 잔여기간을 유지한다', () => {
  const save = create(); save.phase = 'SEASON_RESULT'; save.player.contractYearsLeft = 3;
  expect(createOffers(save, new Rng(2))).toEqual([]);
  const next = nextSeason(save);
  expect(next.player.contractYearsLeft).toBe(2); expect(next.player.salaryCR).toBe(save.player.salaryCR);
});
it('명성은 연봉 제안과 1회 협상에 반영되고 재클릭으로 반복 인상할 수 없다', () => {
  const save = create(); save.phase = 'SEASON_RESULT'; save.contractOffers = createOffers(save, new Rng(2));
  const famous = structuredClone(save); famous.player.reputation = 80;
  famous.contractOffers = createOffers(famous, new Rng(2));
  expect(famous.contractOffers[0].salaryCR).toBeGreaterThan(save.contractOffers[0].salaryCR);
  const negotiated = negotiateSalary(famous, 0);
  expect(negotiated.contractOffers[0].salaryCR).toBeGreaterThan(famous.contractOffers[0].salaryCR);
  expect(negotiateSalary(negotiated, 0)).toBe(negotiated);
  expect(signContract(negotiated, 0).player.salaryCR).toBe(negotiated.contractOffers[0].salaryCR);
});
it('이전 저장의 이미 받은 이적 제안은 보존한다', () => {
  const save = create(); save.phase = 'SEASON_RESULT';
  save.contractOffers = [{ teamId: 'kia', years: 2, year: 2027, salaryCR: 7000, opportunity: 'STARTER' }];
  expect(signContract(save, 0).player.teamId).toBe('kia');
});
