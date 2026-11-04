import 'fake-indexeddb/auto';
import { afterEach, expect, it } from 'vitest';
import { createCareer } from '../engine/career';
import { advanceRound } from '../engine/season';
import { emptyLeague, nextSeason } from '../engine/season';
import { createOffers } from '../engine/contracts';
import { Rng } from '../engine/rng';
import { saveCareer, loadCareer, deleteCareer, getRecoveryNotice } from '../persistence/career';
afterEach(async () => { await deleteCareer(); });
const create = () => createCareer({ name: '저장 테스트', role: 'PITCHER', teamId: 'lg', hand: 'RIGHT' }, 77);
it('계약 등록 기간과 협상 상태를 보존하고 손상 시 복구한다', async () => {
  const valid = create(); valid.phase = 'SEASON_RESULT';
  valid.contractService = { days: 145, faUses: 0, lastFADays: 0, activeRounds: 144, countedYear: 2026 };
  valid.contractOffers = createOffers(valid, new Rng(1)); valid.contractOffers[0].negotiated = true;
  await saveCareer(valid); expect(await loadCareer()).toEqual(valid);
  const corrupt = structuredClone(valid); corrupt.contractService!.lastFADays = 999;
  await saveCareer(corrupt); expect(await loadCareer()).toEqual(valid);
});
it('보직 필드 없는 저장을 유지하고 잘못된 포지션은 직전 저장으로 복구한다', async () => {
  const legacy = create(); delete legacy.player.pitchingRole;
  await saveCareer(legacy); expect(await loadCareer()).toEqual(legacy);
  const corrupt = structuredClone(legacy); corrupt.player.position = 'RF';
  await saveCareer(corrupt);
  expect(await loadCareer()).toEqual(legacy); expect(getRecoveryNotice()).toContain('복구');
});
it('진행 중인 시즌을 IndexedDB에서 복구하고 같은 다음 라운드를 생성한다', async () => {
  const save = advanceRound(advanceRound(create()));
  await saveCareer(save);
  const recovered = await loadCareer();
  expect(recovered).toEqual(save);
  expect(advanceRound(recovered!)).toEqual(advanceRound(save));
  await deleteCareer(); expect(await loadCareer()).toBeNull();
});
it('최초 프리시즌 저장의 선수를 유지하며 시즌 필드를 추가한다', async () => {
  const save = create();
  const legacy = { ...save } as Partial<typeof save>;
  delete legacy.league; delete legacy.year; delete legacy.seasons;
  await saveCareer(legacy as typeof save);
  const recovered = await loadCareer();
  expect(recovered?.player).toEqual(save.player);
  expect(recovered?.league.round).toBe(0);
  expect(recovered?.year).toBe(2026);
});
it('손상된 라운드 데이터는 덮어쓰지 않고 오류를 반환한다', async () => {
  const save = create(); save.league.round = 145;
  await saveCareer(save);
  await expect(loadCareer()).rejects.toThrow('시즌 저장 데이터');
});
it('최근 저장이 손상되면 원자적으로 보관한 직전 저장을 복구한다', async () => {
  const valid = advanceRound(create()); await saveCareer(valid);
  const corrupt = structuredClone(valid); corrupt.league.round = 145; await saveCareer(corrupt);
  expect(await loadCareer()).toEqual(valid);
  expect(getRecoveryNotice()).toContain('복구');
  await deleteCareer(); expect(await loadCareer()).toBeNull();
});
it('기존 8구단 저장의 이름·기록을 보존하고 다음 시즌에 10구단으로 확장한다', async () => {
  const legacy = create();
  legacy.players = legacy.players.filter(p => !['doosan', 'kiwoom'].includes(p.teamId));
  for (const p of legacy.players) if (p.teamId === 'lg') { p.teamId = 'seoul'; if (p.id.startsWith('lg-')) p.id = p.id.replace('lg-', 'seoul-'); }
  legacy.player.teamId = 'seoul'; legacy.player.name = 'seoul';
  legacy.league = emptyLeague(legacy.players);
  const ring = legacy.league.standings.map(t => t.teamId); const fixture: typeof legacy.schedule = [];
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 20; c++) for (let i = 0; i < 4; i++) fixture.push({ id: `old-${c}-${r}-${i}`, round: c * 7 + r + 1, homeTeamId: ring[c % 2 ? 7 - i : i], awayTeamId: ring[c % 2 ? i : 7 - i] });
    ring.splice(1, 0, ring.pop()!);
  }
  legacy.schedule = fixture; await saveCareer(legacy);
  const loaded = (await loadCareer())!;
  expect(loaded.player.name).toBe('seoul'); expect(loaded.player.teamId).toBe('lg');
  expect(loaded.schedule).toHaveLength(560); expect(loaded.league.pitchers.user).toEqual(legacy.league.pitchers.user);
  expect(createOffers(loaded, new Rng(8)).every(offer => loaded.players.some(p => p.teamId === offer.teamId))).toBe(true);
  loaded.phase = 'SEASON_RESULT';
  const expanded = nextSeason(loaded);
  expect(expanded.players).toHaveLength(180); expect(expanded.league.standings).toHaveLength(10); expect(expanded.schedule).toHaveLength(720);
});
