'use client';
import {useState} from 'react';
import type {CareerSave} from '../engine/career';
import {signDraft,teamName} from '../engine/youth';
import {contractMoney} from '../engine/life';
import TeamMark from './TeamMark';
import PixelPlayer from './pixel/PixelPlayer';
export default function DraftReveal({save,busy,update}:{save:CareerSave;busy:boolean;update:(s:CareerSave)=>void}){
 const [skip,setSkip]=useState(false),draft=save.youth!.draft!,selected=!!draft.round;
 return <section className={`draftReveal${skip?' noMotion':''}${selected?'':' undrafted'}`} aria-label="신인 드래프트 결과"><p className="eyebrow">KBO ROOKIE DRAFT · {save.year+1}</p><h2>{selected?'당신의 이름이 불렸습니다.':'다음 도전은 여기서 시작됩니다.'}</h2><p className="draftPick">{selected?`${draft.round}라운드 · 전체 ${draft.overallPick}순위 지명`:'육성선수 입단 제안'}</p><div className="draftStage"><div className="draftSpotlight"/><div className="draftLogo"><TeamMark id={draft.teamId} size={220}/></div>{selected&&<img className="draftFamily" src={`${process.env.NEXT_PUBLIC_BASE_PATH??''}/art/scenes/draft-family.png`} width="1774" height="887" alt="두 손을 들고 함께 기뻐하는 가족"/>}<div className="draftPlayer"><PixelPlayer role={save.player.role} variant={save.life?.appearance}/></div>{selected&&<div className="draftConfetti" aria-hidden="true">{Array.from({length:20},(_,i)=><i key={i} style={{left:`${i*5}%`,animationDelay:`${1.1+i%5*.13}s`,backgroundColor:['#f4b950','#e4efff','#36c9a2'][i%3]}}/>)}</div>}</div><div className="draftAnnouncement"><strong>{teamName(draft.teamId)}</strong><span>{save.player.name} · {teamName(save.youth!.schoolId)}</span><p>{selected?'가족의 환호와 함께, 새로운 유니폼을 향해.':'끝나지 않은 야구 인생, 프로에서 다시 증명할 시간.'}</p></div><p>계약금 {contractMoney(draft.signingBonusCR)} · 연봉 {contractMoney(draft.round?draft.salaryCR:2000)}</p><div className="actions"><button className="primary" disabled={busy} onClick={()=>update(signDraft(save))}>{selected?'프로 입단 계약':'육성선수로 도전'}</button><button type="button" onClick={()=>setSkip(true)}>연출 건너뛰기</button></div></section>;
}
