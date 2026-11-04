import type { CareerSave } from '../engine/career';
import { TRAINING_ITEMS, itemState, openTrainingPack, useTrainingItem } from '../engine/items';
import PixelItem from './pixel/PixelItem';
export default function InventoryPanel({ save, busy, update }: { save: CareerSave; busy: boolean; update: (save: CareerSave) => void }) {
  const items = itemState(save); const opened = items.openedYears.includes(save.year); const used = items.usedYears.includes(save.year);
  return <details className="inventory"><summary>시즌 지원 상자 · 보관 아이템 {items.inventory.length}개</summary><p>매 시즌 상자 1개를 받고 아이템 1개를 사용할 수 있습니다. 훈련 스탯 선택은 별도로 필요합니다.</p><button disabled={busy || opened || save.phase !== 'PRESEASON'} onClick={() => update(openTrainingPack(save))}>{opened ? '이번 시즌 상자 수령 완료' : '시즌 지원 상자 받기'}</button><div className="itemGrid">{items.inventory.map((id, i) => { const item = TRAINING_ITEMS.find(item => item.id === id)!; return <button key={`${id}-${i}`} disabled={busy || used || save.phase !== 'PRESEASON' || save.player.skills[item.skill] >= 99} onClick={() => update(useTrainingItem(save, i))}><PixelItem id={id}/><strong>{item.name}</strong><span>{item.description} · +{Math.min(item.gain,99-save.player.skills[item.skill])}</span></button>; })}</div>{used && <p role="status">이번 시즌 아이템 사용 완료</p>}</details>;
}
