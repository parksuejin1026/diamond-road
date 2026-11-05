import type { CareerSave } from '../engine/career';
import { positionName } from '../engine/positions';
import ContractPanel from './ContractPanel';
export default function PositionSettings({save,busy,onChange}:{save:CareerSave;busy:boolean;onChange:(s:CareerSave)=>Promise<void>}){
  return <><section className="notice"><h3>{positionName(save.player)}</h3><p>{save.player.role==='HITTER'?'감독의 제안이나 선수의 고민이 생기면 시즌 전 면담에서 포지션 전환을 논의합니다. 요청이 거절될 수도 있습니다.':'체력·제구와 등판 성적, 감독 신뢰에 따라 선발 기회가 주어집니다.'}</p></section><ContractPanel save={{...save,contractOffers:[],pendingTrade:null}} busy={busy} update={onChange}/></>;
}
