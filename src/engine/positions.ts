import type { FieldPosition, PAResult, Player } from '../domain/types';
import type { CareerSave } from './career';
import { overall } from '../domain/calculators';
import { Rng } from './rng';
export const FIELD_POSITIONS: { id: FieldPosition; name: string }[] = [
  { id: 'C', name: '포수' }, { id: '1B', name: '1루수' }, { id: '2B', name: '2루수' },
  { id: '3B', name: '3루수' }, { id: 'SS', name: '유격수' }, { id: 'LF', name: '좌익수' },
  { id: 'CF', name: '중견수' }, { id: 'RF', name: '우익수' }, { id: 'DH', name: '지명타자' },
];
export function positionName(player: Player) {
  return player.role === 'HITTER' ? FIELD_POSITIONS.find(p => p.id === (player.position ?? 'DH'))?.name ?? '지명타자' : player.pitchingRole === 'RELIEVER' ? '구원투수' : player.pitchingRole === 'STARTER' ? '선발투수' : '투수';
}
export function selectPosition(save: CareerSave, position: FieldPosition): CareerSave {
  if (save.phase !== 'PRESEASON' || save.player.role !== 'HITTER' || !FIELD_POSITIONS.some(p => p.id === position)) return save;
  const player = { ...save.player, position };
  return { ...save, player, players: save.players.map(p => p.id === player.id ? player : p) };
}
export function pitchingAssignment(save: CareerSave): 'RELIEVER' | 'STARTER' {
  const player = save.player;
  // Missing field belongs to an older save; keep its existing rotation arrangement.
  if (!player.pitchingRole) return save.youth && !save.youth.graduated && player.rosterStatus === 'BENCH' ? 'RELIEVER' : 'STARTER';
  const stats = save.league.pitchers[player.id];
  const enough = stats && stats.outs >= 18;
  const era = stats?.outs ? stats.er * 27 / stats.outs : null;
  const ready = overall(player) >= 55 && player.skills.stamina >= 50 && player.skills.control >= 48;
  const trust = !save.youth || save.youth.graduated || save.youth.trust >= 55;
  if (player.pitchingRole === 'RELIEVER' && ready && trust && enough && era !== null && era <= 4.5) return 'STARTER';
  if (player.pitchingRole === 'STARTER' && enough && stats.outs >= 45 && era !== null && era > 7) return 'RELIEVER';
  return player.pitchingRole;
}
// In-play ground/line balls can be saved or missed by one of the eight actual fielders.
// DH is lineup slot nine and never contributes. No errors or fictional fielding stats are added.
export function applyFielding(result: PAResult, lineup: Player[], rng: Rng): PAResult {
  if (result !== 'SINGLE' && result !== 'BALL_IN_PLAY_OUT') return result;
  const fielders = lineup.slice(0, 8); if (!fielders.length) return result;
  const defense = fielders.reduce((n, p) => n + (p.skills.defense ?? 50), 0) / fielders.length;
  const chance = Math.abs(defense - 50) * .0015;
  const roll = rng.next();
  if (defense > 50 && result === 'SINGLE' && roll < chance) return 'BALL_IN_PLAY_OUT';
  if (defense < 50 && result === 'BALL_IN_PLAY_OUT' && roll < chance) return 'SINGLE';
  return result;
}
