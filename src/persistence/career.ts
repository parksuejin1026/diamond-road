import {PLAYER_STYLES} from '../engine/playStyles';
import { createUniversitySchedule, UNIVERSITIES } from '../engine/schools';
import { prepareLife } from '../engine/life';
import type { CareerSave } from '../engine/career';
import { emptyLeague, emptyHitter, emptyPitcher } from '../engine/season';
import { restoreAvailability } from '../engine/availability';
import { migrateTeamNames } from './migrations';
import { FIELD_POSITIONS } from '../engine/positions';
import { ASIAN_COUNTRIES, isAsianGamesYear } from '../engine/asianGames';
import { TRAINING_ITEMS } from '../engine/items';
import { awardCareerGoal } from '../engine/achievements';
import { SHOP_ITEMS } from '../engine/shop';
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
    previous.onsuccess = () => { if (previous.result) store.put(previous.result, 'backup'); store.put(save, 'active'); if(save.phase==='RETIRED')store.put(save,`archive-${save.seed}-${save.player.name}`); };
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
  if (value.schemaVersion !== 1 || !['POSTSEASON', 'PRESEASON', 'SIMULATING', 'HIGHLIGHT_READY', 'MINI_GAME', 'DRAFT', 'SEASON_RESULT', 'RETIRED'].includes(value.phase) || !value.player || !value.player.skills || !Array.isArray(value.players) || !Array.isArray(value.schedule) || (![560, 720, 728].includes(value.schedule.length) && !(value.youth?.level==='UNIVERSITY' && value.schedule.length===createUniversitySchedule(value.seed).length))) throw new Error('지원하지 않거나 손상된 저장 데이터입니다.');
  value = migrateTeamNames(value);
  // Upgrade the initial development save without discarding the created player.
  if (!value.league && value.phase === 'PRESEASON') { value.league = emptyLeague(value.players); value.year = 2026; value.seasons = []; }
  value.pendingGame ??= null; value.highlightCount ??= 0; value.lastHighlight ??= null;
  value.pendingEvent ??= null; value.eventHistory ??= []; value.eventsThisSeason ??= 0; value.contractHistory ??= []; value.contractOffers ??= []; value.awards ??= []; value.postseason ??= null;
  value.player.rosterStatus ??= value.player.role === 'HITTER' ? 'BENCH' : 'STARTER'; value.player.contractYearsLeft ??= 1; value.player.reputation ??= 0;
  if (['HIGHLIGHT_READY', 'MINI_GAME'].includes(value.phase) && !value.pendingGame) throw new Error('중요 상황 저장 데이터가 손상되었습니다.');
  if (!value.league || !Number.isInteger(value.league.round) || value.league.round < 0 || value.league.round > Math.max(...value.schedule.map(g => g.round)) || !Array.isArray(value.league.results) || !Array.isArray(value.seasons) || !value.league.hitters || !value.league.pitchers || !Array.isArray(value.league.standings)) throw new Error('시즌 저장 데이터가 손상되었습니다.');
  const validInt = (n: unknown) => typeof n === 'number' && Number.isSafeInteger(n) && n >= 0;
  if(value.focusSkill!==undefined&&!(value.focusSkill in value.player.skills)||value.focusRerollYear!==undefined&&(!validInt(value.focusRerollYear)||value.focusRerollYear>value.year)||value.requestedDecision!==undefined&&value.requestedDecision!=='MILITARY')throw new Error('진로 선택 저장이 손상되었습니다.');
  if(value.shop){
    const shop=value.shop,ids=new Set(SHOP_ITEMS.filter(i=>!i.role||i.role===value.player.role).map(i=>i.id));
    if(!validInt(shop.year)||shop.year>value.year||!Array.isArray(shop.stock)||shop.stock.length!==3||new Set(shop.stock).size!==3||shop.stock.some(id=>!ids.has(id))||!Array.isArray(shop.history)||new Set(shop.history.map(h=>h.year)).size!==shop.history.length||shop.history.some(h=>!validInt(h.year)||h.year>value.year||!ids.has(h.id)||!validInt(h.price)||!h.gains||Object.entries(h.gains).some(([k,g])=>!(k in value.player.skills)||!validInt(g)||g>10))||(shop.purchased!==null&&(!shop.stock.includes(shop.purchased)||!shop.history.some(h=>h.year===shop.year&&h.id===shop.purchased))))throw new Error('아이템 상점 저장 데이터가 손상되었습니다.');
  }
  if(value.life){
    const state=value.life;
    if(state.version!==1||!validInt(state.cash)||!validInt(state.mentality)||state.mentality>100||!validInt(state.style)||state.style>=PLAYER_STYLES[value.player.role].length||!validInt(state.appearance)||state.appearance>11||!validInt(state.number)||state.number<1||state.number>99||(state.routine!==undefined&&!['BALANCED','FOOD','HOBBY','REST'].includes(state.routine))||!Array.isArray(state.ledger)||!Array.isArray(state.purchases)||!Array.isArray(state.salaryRequests)||!Array.isArray(state.news)||new Set(state.ledger.map(r=>r.id)).size!==state.ledger.length||state.ledger.some(r=>typeof r.id!=='string'||!Number.isSafeInteger(r.amount)||!validInt(r.year)||typeof r.reason!=='string')||state.purchases.some(p=>!validInt(p.year)||!Number.isInteger(p.gain)||p.gain<1||p.gain>3)||!validInt(value.player.health)||value.player.health>100)throw new Error('현금·생활 관리 저장 데이터가 손상되었습니다.');
    const event=state.turningPoint;
    if(state.styleHistory&&(!Array.isArray(state.styleHistory)||state.styleHistory.some(h=>!validInt(h.year)||h.year>value.year||!validInt(h.round)||!Number.isInteger(h.from)||!PLAYER_STYLES[value.player.role][h.from]||!Number.isInteger(h.to)||!PLAYER_STYLES[value.player.role][h.to])))throw new Error('플레이스타일 변경 이력이 손상되었습니다.');
    if(event&&(!validInt(event.year)||event.year>value.year||!validInt(event.round)||event.round>Math.max(...value.schedule.map(g=>g.round))||!['NONE','SCHEDULED','PENDING','RESOLVED'].includes(event.status)||event.status!=='NONE'&&(!['STYLE','FOCUS'].includes(event.kind??'')||event.kind==='STYLE'&&(!Number.isInteger(event.style)||!PLAYER_STYLES[value.player.role][event.style!])||event.kind==='FOCUS'&&!(event.focus! in value.player.skills))))throw new Error('전환점 이벤트 저장이 손상되었습니다.');
    if(state.growth&&(!validInt(state.growth.year)||!Array.isArray(state.growth.skills)||!Array.isArray(state.growth.gains)||state.growth.skills.length>2||state.growth.skills.length!==state.growth.gains.length||new Set(state.growth.skills).size!==state.growth.skills.length||state.growth.skills.some(k=>!(k in value.player.skills))||state.growth.gains.some(g=>!validInt(g))))throw new Error('자동 성장 저장 데이터가 손상되었습니다.');
  }
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
  if (value.youth && (!Number.isInteger(value.youth.grade) || value.youth.grade < 1 || value.youth.grade > (value.youth.level==='UNIVERSITY'?4:3) || !Array.isArray(value.youth.history))) throw new Error('고교 커리어 저장이 손상되었습니다.');
  if(value.youth?.level==='UNIVERSITY'&&!UNIVERSITIES.some(t=>t.id===value.youth!.schoolId))throw new Error('대학 커리어 저장이 손상되었습니다.');
  if(value.decisions&&(!Array.isArray(value.decisions)||value.decisions.some(id=>typeof id!=='string')||new Set(value.decisions).size!==value.decisions.length))throw new Error('이벤트 저장이 손상되었습니다.');
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
  const restored = restoreAvailability(value); if(!restored.life)prepareLife(restored); awardCareerGoal(restored); return restored;
}
export async function archivedCareers():Promise<CareerSave[]> { return (await access('readonly',store=>store.getAll()) as CareerSave[]).filter((s,i,all)=>s.phase==='RETIRED'&&all.findIndex(v=>v.seed===s.seed&&v.player.name===s.player.name)===i); }
export async function deleteCareer() { await access('readwrite', store => store.delete('active')); await access('readwrite',store=>store.delete('backup')); setRecoveryNotice(''); }
