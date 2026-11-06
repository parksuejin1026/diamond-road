import { focusSkill } from '../engine/development';
import type { CareerSave } from '../engine/career';
import { life, prepareLife, skillNames, won, contractMoney, requestSalary } from '../engine/life';
import { PLAYER_STYLES } from '../engine/roster';
import GearShop from './GearShop';
export default function LifePanel({save,busy,update}:{save:CareerSave;busy:boolean;update:(s:CareerSave)=>void}){
 prepareLife(save);const state=life(save),pre=save.phase==='PRESEASON';
 return <section className="lifePanel"><div className="homeStats"><div><span>보유 현금</span><strong>{won(state.cash)}</strong></div><div><span>연봉</span><strong>{contractMoney(save.player.salaryCR)}</strong></div><div><span>멘탈</span><strong>{state.mentality} / 100</strong></div><div><span>건강</span><strong>{save.player.health} / 100</strong></div></div>
 <div className="automaticGrowth"><p className="eyebrow">현재 성장 방향</p><h3>{PLAYER_STYLES[save.player.role][state.style].name}</h3><p>현재 스타일과 집중 능력을 중심으로 성장합니다. 시즌 중 새로운 방향을 제안받을 때 직접 선택할 수 있습니다.</p><p>집중 육성 · <strong>{skillNames[focusSkill(save)]}</strong></p><div className="focusTags">{state.growth?.skills.map(k=><span key={k}>{skillNames[k]}</span>)}</div></div>
 {pre?<GearShop save={save} busy={busy} update={update}/>:<p>새 장비는 다음 시즌 준비 때 구매할 수 있습니다.</p>}
 {save.phase==='SEASON_RESULT'&&!(save.youth&&!save.youth.graduated)&&<button disabled={busy||state.salaryRequests.includes(save.year)} onClick={()=>update(requestSalary(save))}>{state.salaryRequests.includes(save.year)?'올해 연봉 인상 요구 완료':'다음 시즌 연봉 인상 요구'}</button>}
 {state.news.filter(n=>n.year===save.year).map((n,i)=><p key={i}>{n.text}</p>)}</section>;
}
