import type { CareerSave } from '../engine/career';
import { life, prepareLife, skillNames, won, contractMoney, answerMeeting, requestSalary } from '../engine/life';
import { PLAYER_STYLES } from '../engine/roster';
import GearShop from './GearShop';
export default function LifePanel({save,busy,update}:{save:CareerSave;busy:boolean;update:(s:CareerSave)=>void}){
 prepareLife(save);const state=life(save),meeting=state.meeting,pre=save.phase==='PRESEASON';
 return <section className="lifePanel"><div className="homeStats"><div><span>보유 현금</span><strong>{won(state.cash)}</strong></div><div><span>연봉</span><strong>{contractMoney(save.player.salaryCR)}</strong></div><div><span>멘탈</span><strong>{state.mentality} / 100</strong></div><div><span>건강</span><strong>{save.player.health} / 100</strong></div></div>
 {pre&&<><div className="automaticGrowth"><p className="eyebrow">YOUR PLAY STYLE</p><h3>{PLAYER_STYLES[save.player.role][state.style].name}</h3><p>플레이스타일에 따라 시즌을 보내며 자동으로 성장합니다.</p><div className="focusTags">{state.growth?.skills.map(k=><span key={k}>{skillNames[k]}</span>)}</div></div><GearShop save={save} busy={busy} update={update}/>
 {meeting&&!meeting.answered&&(meeting.style!==undefined||meeting.position)&&<details><summary>감독이 면담을 요청했습니다</summary>{meeting.style!==undefined&&<p>“{PLAYER_STYLES[save.player.role][meeting.style].name} 방향으로 바꿔 보는 건 어떨까?” <button disabled={busy} onClick={()=>update(answerMeeting(save,'style',true))}>특성 변경 수락</button></p>}{meeting.position&&<p>{meeting.selfRequest?`새로운 도전이 떠오릅니다. ${meeting.position} 전환을 감독에게 요청할까요?`:`“새 시즌 ${meeting.position} 포지션을 맡아 보자.”`} <button disabled={busy} onClick={()=>update(answerMeeting(save,'position',true))}>{meeting.selfRequest?'포지션 전환 요청':'포지션 전환 수락'}</button></p>}<button disabled={busy} onClick={()=>update(answerMeeting(save,'style',false))}>현재 방향 유지</button></details>}</>}
 {save.phase==='SEASON_RESULT'&&!(save.youth&&!save.youth.graduated)&&<button disabled={busy||state.salaryRequests.includes(save.year)} onClick={()=>update(requestSalary(save))}>{state.salaryRequests.includes(save.year)?'올해 연봉 인상 요구 완료':'다음 시즌 연봉 인상 요구'}</button>}
 {state.news.filter(n=>n.year===save.year).map((n,i)=><p key={i}>{n.text}</p>)}</section>;
}
