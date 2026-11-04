import type { CareerSave } from '../engine/career';
import { emptyLeague, emptyHitter, emptyPitcher } from '../engine/season';
import { migrateTeamNames } from './migrations';
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
  const playerIds = new Set(value.players.map(p => p.id));
  if (value.players.length !== value.league.standings.length * 18 || playerIds.size !== value.players.length || !playerIds.has(value.player.id) || !validInt(value.rngState) || !validInt(value.year) || !validInt(value.highlightCount) || value.highlightCount > 3) throw new Error('선수 저장 데이터가 손상되었습니다.');
  if (value.youth && (!Number.isInteger(value.youth.grade) || value.youth.grade < 1 || value.youth.grade > 3 || !Array.isArray(value.youth.history))) throw new Error('고교 커리어 저장이 손상되었습니다.');
  value.players = value.players.map(p => p.id === value.player.id ? value.player : p);
  for (const player of value.players) {
    const keys = player.role === 'HITTER' ? ['contact', 'power', 'eye', 'speed', 'defense', 'mental'] : ['velocity', 'control', 'breaking', 'stamina', 'mental'];
    if (!player.skills || keys.some(k => !validInt(player.skills[k]) || player.skills[k] < 1 || player.skills[k] > 99)) throw new Error('능력치 저장 데이터가 손상되었습니다.');
    const stats = player.role === 'HITTER' ? value.league.hitters[player.id] : value.league.pitchers[player.id];
    const expected = player.role === 'HITTER' ? emptyHitter() : emptyPitcher();
    if (stats && player.role === 'HITTER') (stats as import('../domain/types').HitterStats).gidp ??= 0;
    if (!stats || Object.keys(expected).some(k => !validInt((stats as unknown as Record<string, number>)[k]))) throw new Error('기록 저장 데이터가 손상되었습니다.');
  }
  if (value.pendingGame && (!Array.isArray(value.pendingGame.clubs) || value.pendingGame.clubs.length !== 2 || !value.pendingGame.game || !validInt(value.pendingGame.pa) || value.pendingGame.fixture.round !== value.league.round + 1 || !validInt(value.pendingGame.game.outs) || value.pendingGame.game.outs > 2)) throw new Error('진행 중인 경기 저장이 손상되었습니다.');
  return value;
}
export async function deleteCareer() { await access('readwrite', store => store.clear()); setRecoveryNotice(''); }
