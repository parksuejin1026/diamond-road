import { rerollFocus, focusSkill } from '../engine/development';
import type { CareerSave } from '../engine/career';
import { life, prepareLife, skillNames, won, contractMoney, requestSalary } from '../engine/life';
import { PLAYER_STYLES } from '../engine/roster';
import GearShop from './GearShop';
export default function LifePanel({save,busy,update}:{save:CareerSave;busy:boolean;update:(s:CareerSave)=>void}){
 prepareLife(save);const state=life(save),pre=save.phase==='PRESEASON';
 return <section className="lifePanel"><div className="homeStats"><div><span>보유 현금</span><strong>{won(state.cash)}</strong></div><div><span>연봉</span><strong>{contractMoney(save.player.salaryCR)}</strong></div><div><span>멘탈</span><strong>{state.mentality} / 100</strong></div><div><span>건강</span><strong>{save.player.health} / 100</strong></div></div>
 {pre&&<><div className="automaticGrowth"><p className="eyebrow">YOUR PLAY STYLE</p><h3>{PLAYER_STYLES[save.player.role][state.style].name}</h3><p>집중 능력치와 보조 능력치가 시즌 종료 후 성장합니다.</p><p>집중 육성 · <strong>{skillNames[focusSkill(save)]}</strong></p><button disabled={busy||save.focusRerollYear===save.year||save.league.round>0} onClick={()=>update(rerollFocus(save))}>{save.focusRerollYear===save.year?'올해 랜덤 변경 완료':'집중 능력치 랜덤 변경 · 시즌당 1회'}</button><div className="focusTags">{state.growth?.skills.map(k=><span key={k}>{skillNames[k]}</span>)}</div></div><GearShop save={save} busy={busy} update={update}/>
</>}
 {save.phase==='SEASON_RESULT'&&!(save.youth&&!save.youth.graduated)&&<button disabled={busy||state.salaryRequests.includes(save.year)} onClick={()=>update(requestSalary(save))}>{state.salaryRequests.includes(save.year)?'올해 연봉 인상 요구 완료':'다음 시즌 연봉 인상 요구'}</button>}
 {state.news.filter(n=>n.year===save.year).map((n,i)=><p key={i}>{n.text}</p>)}</section>;
}
