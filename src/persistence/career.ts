import type { CareerSave } from '../engine/career';
import { emptyLeague, emptyHitter, emptyPitcher } from '../engine/season';
import { restoreAvailability } from '../engine/availability';
import { migrateTeamNames } from './migrations';
import { FIELD_POSITIONS } from '../engine/positions';
import { ASIAN_COUNTRIES, isAsianGamesYear } from '../engine/asianGames';
import { TRAINING_ITEMS } from '../engine/items';
import { awardCareerGoal } from '../engine/achievements';
async function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('diamond-road', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('saves');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function access(mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest): Promise<unknown> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('saves', mode);
    const request = operation(tx.objectStore('saves'));
    tx.oncomplete = () => { db.close(); resolve(request.result); };
    tx.onerror = tx.onabort = () => { db.close(); reject(tx.error ?? new Error('저장소 접근에 실패했습니다.')); };
  });
}
export async function saveCareer(save: CareerSave) {
  await access('readwrite', store => {
    const previous = store.get('active');
    previous.onsuccess = () => { if (previous.result) store.put(previous.result, 'backup'); store.put(save, 'active'); };
    return previous;
  });
  setRecoveryNotice('');
}
let recoveryNotice = '';
function setRecoveryNotice(message: string) { recoveryNotice = message; try { if (message) sessionStorage.setItem('diamond-road-recovery', message); else sessionStorage.removeItem('diamond-road-recovery'); } catch {} }
export function getRecoveryNotice() { return recoveryNotice; }
export async function loadCareer(): Promise<CareerSave | null> {
  try { recoveryNotice = sessionStorage.getItem('diamond-road-recovery') ?? recoveryNotice; } catch {}
  try { return await loadCandidate('active'); }
  catch (error) {
    const backup = await loadCandidate('backup');
    if (!backup) throw error;
    setRecoveryNotice('최근 저장을 읽지 못해 직전 저장 상태로 복구했습니다. 다시 진행하면 복구 상태가 저장됩니다.');
    try { await access('readwrite', store => store.put(backup, 'active')); } catch { /* The recovered value is still usable if storage is temporarily full. */ }
    return backup;
  }
}
async function loadCandidate(key: string): Promise<CareerSave | null> {
  let value = await access('readonly', store => store.get(key)) as CareerSave | undefined;
  if (!value) return null;
  if (value.schemaVersion !== 1 || !['PRESEASON', 'SIMULATING', 'HIGHLIGHT_READY', 'MINI_GAME', 'DRAFT', 'SEASON_RESULT', 'RETIRED'].includes(value.phase) || !value.player || !value.player.skills || !Array.isArray(value.players) || !Array.isArray(value.schedule) || ![560, 720, 728].includes(value.schedule.length)) throw new Error('지원하지 않거나 손상된 저장 데이터입니다.');
  value = migrateTeamNames(value);
  // Upgrade the initial development save without discarding the created player.
  if (!value.league && value.phase === 'PRESEASON') { value.league = emptyLeague(value.players); value.year = 2026; value.seasons = []; }
  value.pendingGame ??= null; value.highlightCount ??= 0; value.lastHighlight ??= null;
  value.pendingEvent ??= null; value.eventHistory ??= []; value.eventsThisSeason ??= 0; value.contractHistory ??= []; value.contractOffers ??= []; value.awards ??= []; value.postseason ??= null;
  value.player.rosterStatus ??= value.player.role === 'HITTER' ? 'BENCH' : 'STARTER'; value.player.contractYearsLeft ??= 1; value.player.reputation ??= 0;
  if (['HIGHLIGHT_READY', 'MINI_GAME'].includes(value.phase) && !value.pendingGame) throw new Error('중요 상황 저장 데이터가 손상되었습니다.');
  if (!value.league || !Number.isInteger(value.league.round) || value.league.round < 0 || value.league.round > Math.max(...value.schedule.map(g => g.round)) || !Array.isArray(value.league.results) || !Array.isArray(value.seasons) || !value.league.hitters || !value.league.pitchers || !Array.isArray(value.league.standings)) throw new Error('시즌 저장 데이터가 손상되었습니다.');
  const validInt = (n: unknown) => typeof n === 'number' && Number.isSafeInteger(n) && n >= 0;
  if (value.items) {
    const items = value.items;
    if (!Array.isArray(items.inventory) || items.inventory.some(id => !TRAINING_ITEMS.some(item => item.id === id)) || [items.openedYears, items.usedYears].some(years => !Array.isArray(years) || new Set(years).size !== years.length || years.some(year => !validInt(year) || year > value.year))) throw new Error('아이템 저장 데이터가 손상되었습니다.');
  }
  if (value.mvpReward && (!validInt(value.mvpReward.year) || value.mvpReward.year > value.year || typeof value.mvpReward.title !== 'string')) throw new Error('MVP 보상 저장 데이터가 손상되었습니다.');
  for (const contract of [...value.contractHistory, ...value.contractOffers, ...(value.pendingTrade ? [value.pendingTrade] : [])]) {
    if (!contract || typeof contract.teamId !== 'string' || !validInt(contract.salaryCR) || !validInt(contract.year) || !validInt(contract.years) || contract.years < 1 || (contract.signingBonusCR !== undefined && !validInt(contract.signingBonusCR)) || (contract.option && (!['HITS','STRIKEOUTS'].includes(contract.option.metric) || !validInt(contract.option.target) || contract.option.target < 1 || !validInt(contract.option.bonusCR)))) throw new Error('계약 저장 데이터가 손상되었습니다.');
  }
  if (value.contractSettlements && (!Array.isArray(value.contractSettlements) || new Set(value.contractSettlements.map(s=>s.year)).size !== value.contractSettlements.length || value.contractSettlements.some(s=>![s.year,s.salaryCR,s.signingBonusCR,s.optionBonusCR].every(validInt) || s.year > value.year || typeof s.teamId !== 'string' || typeof s.optionAchieved !== 'boolean'))) throw new Error('계약 정산 저장 데이터가 손상되었습니다.');
  if (value.asianGames !== undefined) {
    if (!Array.isArray(value.asianGames) || new Set(value.asianGames.map(report => report.year)).size !== value.asianGames.length) throw new Error('국제대회 저장 데이터가 손상되었습니다.');
    const countries = new Set<string>(ASIAN_COUNTRIES.map(country => country.id));
    for (const report of value.asianGames) {
      if (!validInt(report.year) || !isAsianGamesYear(report.year) || report.year > value.year || typeof report.selected !== 'boolean' || typeof report.reason !== 'string' || !validInt(report.rank) || report.rank < 1 || report.rank > 8 || ![null, 'GOLD', 'SILVER', 'BRONZE'].includes(report.medal) || !validInt(report.reputationGain) || !Array.isArray(report.roster) || report.roster.length !== 24 || !Array.isArray(report.games) || new Set(report.games.map(game => game.id)).size !== report.games.length) throw new Error('국제대회 저장 데이터가 손상되었습니다.');
      if (report.games.some(game => !countries.has(game.homeTeamId) || !countries.has(game.awayTeamId) || game.homeTeamId === game.awayTeamId || !validInt(game.home) || !validInt(game.away) || !validInt(game.innings))) throw new Error('국제대회 경기 저장 데이터가 손상되었습니다.');
      if (new Set(report.roster.map(player => player.id)).size !== report.roster.length || report.roster.some(player => typeof player.id !== 'string' || typeof player.name !== 'string' || typeof player.clubTeamId !== 'string' || !['HITTER', 'PITCHER'].includes(player.role) || !validInt(player.age) || !validInt(player.ovr) || player.ovr < 1 || player.ovr > 99 || typeof player.wildcard !== 'boolean')) throw new Error('대표팀 명단 저장 데이터가 손상되었습니다.');
      for (const [stats, expected] of [[report.hitter, emptyHitter()], [report.pitcher, emptyPitcher()]] as const) if (stats && Object.keys(expected).some(key => !validInt((stats as unknown as Record<string, number>)[key]))) throw new Error('국제대회 개인 기록이 손상되었습니다.');
    }
  }
  if (value.contractService) {
    const service = value.contractService;
    if (![service.days, service.faUses, service.lastFADays, service.activeRounds].every(validInt) || service.lastFADays > service.days || service.activeRounds > Math.max(...value.schedule.map(g => g.round)) || (service.countedYear !== undefined && (!validInt(service.countedYear) || service.countedYear > value.year))) throw new Error('계약 등록 기간 저장 데이터가 손상되었습니다.');
  }
  const playerIds = new Set(value.players.map(p => p.id));
  if (value.players.length !== value.league.standings.length * 18 || playerIds.size !== value.players.length || !playerIds.has(value.player.id) || !validInt(value.rngState) || !validInt(value.year) || !validInt(value.highlightCount) || value.highlightCount > 3) throw new Error('선수 저장 데이터가 손상되었습니다.');
  if (value.youth && (!Number.isInteger(value.youth.grade) || value.youth.grade < 1 || value.youth.grade > 3 || !Array.isArray(value.youth.history))) throw new Error('고교 커리어 저장이 손상되었습니다.');
  value.players = value.players.map(p => p.id === value.player.id ? value.player : p);
  for (const player of value.players) {
    if (player.position !== undefined && (player.role !== 'HITTER' || !FIELD_POSITIONS.some(p => p.id === player.position))) throw new Error('수비 포지션 저장 데이터가 손상되었습니다.');
    if (player.pitchingRole !== undefined && (player.role !== 'PITCHER' || !['RELIEVER', 'STARTER'].includes(player.pitchingRole))) throw new Error('투수 보직 저장 데이터가 손상되었습니다.');
    const keys = player.role === 'HITTER' ? ['contact', 'power', 'eye', 'speed', 'defense', 'mental'] : ['velocity', 'control', 'breaking', 'stamina', 'mental'];
    if (!player.skills || keys.some(k => !validInt(player.skills[k]) || player.skills[k] < 1 || player.skills[k] > 99)) throw new Error('능력치 저장 데이터가 손상되었습니다.');
    const stats = player.role === 'HITTER' ? value.league.hitters[player.id] : value.league.pitchers[player.id];
    const expected = player.role === 'HITTER' ? emptyHitter() : emptyPitcher();
    if (stats && player.role === 'HITTER') (stats as import('../domain/types').HitterStats).gidp ??= 0;
    if (!stats || Object.keys(expected).some(k => !validInt((stats as unknown as Record<string, number>)[k]))) throw new Error('기록 저장 데이터가 손상되었습니다.');
  }
  if (value.pendingGame && (!Array.isArray(value.pendingGame.clubs) || value.pendingGame.clubs.length !== 2 || !value.pendingGame.game || !validInt(value.pendingGame.pa) || value.pendingGame.fixture.round !== value.league.round + 1 || !validInt(value.pendingGame.game.outs) || value.pendingGame.game.outs > 2)) throw new Error('진행 중인 경기 저장이 손상되었습니다.');
  const restored = restoreAvailability(value); awardCareerGoal(restored); return restored;
}
export async function deleteCareer() { await access('readwrite', store => store.clear()); setRecoveryNotice(''); }
