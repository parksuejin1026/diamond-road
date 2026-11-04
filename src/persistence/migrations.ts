import { LEGACY_TEAM_IDS, TEAMS } from '../engine/schedule';
import type { CareerSave } from '../engine/career';
export function migrateTeamNames(save: CareerSave): CareerSave {
  if (!save.players?.some(p => p.teamId in LEGACY_TEAM_IDS)) return save;
  function id(value: string) {
    if (LEGACY_TEAM_IDS[value]) return LEGACY_TEAM_IDS[value];
    for (const [oldId, newId] of Object.entries(LEGACY_TEAM_IDS)) if (value.startsWith(oldId + '-')) return newId + value.slice(oldId.length);
    return value;
  }
  function visit(value: unknown, key = ''): unknown {
    if (typeof value === 'string') return key === 'name' ? value : id(value);
    if (Array.isArray(value)) return value.map(v => visit(v));
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [id(k), visit(v, k)]));
    return value;
  }
  const migrated = visit(save) as CareerSave;
  for (const player of migrated.players) if (player.id !== migrated.player.id) player.name = (TEAMS.find(t => t.id === player.teamId)?.name ?? '') + ' 선수 ' + (Number(player.id.split('-').pop()) + 1);
  return migrated;
}
