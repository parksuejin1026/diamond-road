import type { CareerSave } from './career';
export interface TrainingItem { id: string; name: string; skill: string; gain: number; description: string; }
export interface ItemState { inventory: string[]; openedYears: number[]; usedYears: number[]; }
export const TRAINING_ITEMS: TrainingItem[] = [
  { id: 'bat', name: '장인의 배트', skill: 'power', gain: 3, description: '타구에 힘을 싣는 특별 훈련' },
  { id: 'glove', name: '길들인 글러브', skill: 'defense', gain: 3, description: '기본기를 반복해 수비 향상' },
  { id: 'shoes', name: '트랙 스파이크', skill: 'speed', gain: 3, description: '첫 발과 주루 훈련' },
  { id: 'tee', name: '배팅 티', skill: 'contact', gain: 3, description: '정확한 타격 궤적 연습' },
  { id: 'target', name: '제구 타깃', skill: 'control', gain: 3, description: '원하는 코스로 보내는 훈련' },
  { id: 'ball', name: '그립 훈련구', skill: 'breaking', gain: 3, description: '공 끝의 움직임 연습' },
  { id: 'band', name: '트레이닝 밴드', skill: 'velocity', gain: 3, description: '투구 동작과 구속 향상' },
  { id: 'notebook', name: '분석 노트', skill: 'mental', gain: 3, description: '승부를 읽는 집중 훈련' },
  { id: 'golden-bat', name: '전설의 황금 배트', skill: 'power', gain: 5, description: 'MVP 12회 달성 기념' },
  { id: 'golden-ball', name: '전설의 황금 공', skill: 'control', gain: 5, description: 'MVP 12회 달성 기념' },
];
export const itemState = (save: CareerSave): ItemState => save.items ?? { inventory: [], openedYears: [], usedYears: [] };
export function openTrainingPack(save: CareerSave): CareerSave {
  const items = itemState(save);
  if (save.phase !== 'PRESEASON' || items.openedYears.includes(save.year)) return save;
  const available = TRAINING_ITEMS.filter(item => item.skill in save.player.skills && !item.id.startsWith('golden-'));
  const chosen = available[((save.seed ^ (save.year * 31)) >>> 0) % available.length];
  return { ...save, items: { ...items, openedYears: [...items.openedYears, save.year], inventory: [...items.inventory, chosen.id] } };
}
export function useTrainingItem(save: CareerSave, index: number): CareerSave {
  const items = itemState(save); const item = TRAINING_ITEMS.find(item => item.id === items.inventory[index]);
  if (save.phase !== 'PRESEASON' || items.usedYears.includes(save.year) || !item || !(item.skill in save.player.skills) || save.player.skills[item.skill] >= 99) return save;
  const player = { ...save.player, skills: { ...save.player.skills, [item.skill]: Math.min(99, save.player.skills[item.skill] + item.gain) } };
  return { ...save, player, players: save.players.map(p => p.id === player.id ? player : p), items: { ...items, inventory: items.inventory.filter((_, i) => i !== index), usedYears: [...items.usedYears, save.year] } };
}
