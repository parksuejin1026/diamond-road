import type { CareerSave } from './career';
import { itemState } from './items';
export const MVP_TARGET = 12;
export const mvpCount = (save: CareerSave) => save.seasons.filter(season => season.awards?.includes('시즌 MVP')).length;
export function awardCareerGoal(save: CareerSave) {
  if (mvpCount(save) < MVP_TARGET || save.mvpReward) return;
  save.mvpReward = { year: save.year, title: '다이아몬드의 전설' };
  const items = itemState(save);
  save.items = { ...items, inventory: [...items.inventory, save.player.role === 'HITTER' ? 'golden-bat' : 'golden-ball'] };
}
