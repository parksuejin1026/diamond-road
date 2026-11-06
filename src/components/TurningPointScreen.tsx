'use client';
import type {CareerSave} from '../engine/career';
import {playStyle,styleRedistribution} from '../engine/playStyles';
import {answerTurningPoint,acknowledgeTurningPoint} from '../engine/turningPoints';
import {skillNames} from '../engine/life';
import {overall} from '../domain/calculators';
export default function TurningPointScreen({save,busy,update,result=false}:{save:CareerSave;busy:boolean;update:(s:CareerSave)=>void;result?:boolean}){
  const event=save.life!.turningPoint!,current=playStyle(save.player.role,save.life!.style),next=event.style===undefined?null:playStyle(save.player.role,event.style);
  const proposed=event.kind==='STYLE'&&event.style!==undefined?styleRedistribution(save.player.skills,save.player.role,event.style):save.player.skills;
  const before=result?event.beforeSkills??save.player.skills:save.player.skills,after=result?event.afterSkills??save.player.skills:proposed;
  const changed=Object.keys(before).filter(k=>before[k]!==after[k]);
  return <section className="turningPoint"><div className="eventStamp">{save.league.round} ROUND · {event.kind==='STYLE'?'새로운 플레이스타일':'성장 방향의 전환점'}</div>
    {result?<><h2>{event.accepted?'새로운 방향으로 나아갑니다':'나만의 방향을 이어갑니다'}</h2><p>{event.accepted?event.kind==='STYLE'?`새 플레이스타일은 ${current.name}입니다. 성장 방향과 실제 능력치에 반영했습니다.`:`집중 능력을 ${skillNames[save.focusSkill!]}으로 바꿨습니다.`:'현재 스타일과 집중 능력을 유지합니다.'}</p></>:<><p className="eventLead">{event.kind==='STYLE'?'코치가 최근 경기를 돌아보며 새로운 가능성을 이야기합니다.':'훈련 중 새로운 강점을 발견했습니다.'}</p><div className="styleComparison"><article><span>현재 플레이스타일</span><h2>{current.name}</h2><p>{current.approach}</p><small>성장 · {current.growth.map(k=>skillNames[k]).join(' · ')}</small></article><span className="comparisonArrow" aria-hidden="true">→</span><article className="proposedStyle"><span>새로운 제안</span><h2>{next?.name??skillNames[event.focus!]}</h2><p>{next?.approach??'앞으로 이 능력을 중심으로 훈련합니다. 지금까지 쌓은 능력치는 유지됩니다.'}</p>{next&&<small>성장 · {next.growth.map(k=>skillNames[k]).join(' · ')}</small>}</article></div></>}
    {changed.length>0&&<section className="styleChanges" aria-label="스타일 전환 능력치 비교"><div><strong>OVR {overall({...save.player,skills:before})} → {overall({...save.player,skills:after})}</strong><span>능력치를 새 스타일에 맞게 재배분합니다.</span></div><dl>{changed.map(k=><div key={k}><dt>{skillNames[k]}</dt><dd>{before[k]} <span>→</span> {after[k]} <b className={after[k]>before[k]?'positive':'negative'}>{after[k]>before[k]?'+':''}{after[k]-before[k]}</b></dd></div>)}</dl></section>}
    {!result&&<p className="mutedExplanation">매년 반드시 바뀌는 것은 아닙니다. 제안이 마음에 들지 않으면 현재 방향을 유지할 수 있습니다.</p>}
    <div className="decisionOptions">{result?<button className="primary" disabled={busy} onClick={()=>update(acknowledgeTurningPoint(save))}>확인 · 시즌 이어가기 →</button>:<><button className="primary" disabled={busy} onClick={()=>update(answerTurningPoint(save,true))}>제안 수락 · {next?.name??skillNames[event.focus!]}</button><button disabled={busy} onClick={()=>update(answerTurningPoint(save,false))}>현재 방향 유지</button></>}</div>
  </section>;
}
