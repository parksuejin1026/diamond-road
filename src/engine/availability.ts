import type { CareerSave } from './career';
// Deprecated fields are normalized solely to read older saves. They no longer affect play.
export function restoreAvailability(save: CareerSave): CareerSave {
  const normalize = (player: CareerSave['player']) => player.health === 100 && player.fatigue === 0 && !(player.injuredUntil ?? 0) && player.rosterStatus !== 'INJURED' ? player : ({ ...player, health: 100, fatigue: 0, injuredUntil: 0, rosterStatus: player.rosterStatus === 'INJURED' ? player.role === 'HITTER' ? 'BENCH' as const : 'STARTER' as const : player.rosterStatus });
  const player = normalize(save.player);
  return { ...save, player, players: save.players.map(p => p.id === player.id ? player : normalize(p)) };
}
