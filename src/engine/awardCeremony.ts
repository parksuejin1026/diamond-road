import type {CareerSave} from './career';
import {isYouth} from './youth';

export const honorKey = (title: string) => `HONOR:${title}`;
export function seasonHonors(save: CareerSave): string[] {
  if (isYouth(save)) return [];
  const snapshot = save.seasons.find(season => season.year === save.year);
  const titles = snapshot?.awards ?? save.awards.filter(award => award.playerId === save.player.id).map(award => award.title);
  return [...new Set(titles.filter(title => title === '시즌 MVP' || title.startsWith('골든글러브 ')))]
    .sort((a, b) => a === '시즌 MVP' ? -1 : b === '시즌 MVP' ? 1 : a.localeCompare(b));
}
export function pendingHonor(save: CareerSave): string | undefined {
  if (!['SEASON_RESULT', 'RETIRED'].includes(save.phase)) return undefined;
  return seasonHonors(save).find(title => !save.decisions?.includes(`${save.year}:${honorKey(title)}`));
}
