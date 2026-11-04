import type { CareerSave } from '../engine/career';
import { FIELD_POSITIONS, positionName, selectPosition } from '../engine/positions';
import type { FieldPosition } from '../domain/types';
import ContractPanel from './ContractPanel';
export default function PositionSettings({ save, busy, onChange }: { save: CareerSave; busy: boolean; onChange: (save: CareerSave) => Promise<void> }) {
  return <><section className="notice"><h3>{positionName(save.player)}</h3>{save.player.role === 'HITTER' ? <><label>수비 포지션<select value={save.player.position ?? 'DH'} disabled={busy || save.phase !== 'PRESEASON'} onChange={e => onChange(selectPosition(save, e.target.value as FieldPosition))}>{FIELD_POSITIONS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label><p>시즌 시작 전 포지션을 바꿀 수 있습니다. 수비 능력치는 인플레이 타구 처리에 반영되며, 지명타자로 출전할 때는 수비에 참여하지 않습니다.</p></> : <p>구원 등판에서 기회를 쌓습니다. 체력·제구와 등판 성적이 좋아지면 선발 기회를 얻고, 부진하면 구원으로 돌아올 수 있습니다. 고교에서는 감독 신뢰도도 필요합니다.</p>}</section><ContractPanel save={{ ...save, contractOffers: [] }} busy={busy} update={onChange} /></>;
}
