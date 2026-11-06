'use client';
import {useEffect,useState} from 'react';
import type {CareerSave} from '../engine/career';
import {personalMoment} from '../engine/moments';
import ReplayStage from './ReplayStage';
export default function MomentTheater({save}:{save:CareerSave}){
  const [replay,setReplay]=useState(0),[paused,setPaused]=useState(false),[slow,setSlow]=useState(false);
  useEffect(()=>{const media=window.matchMedia('(prefers-reduced-motion: reduce)');const update=()=>{if(media.matches)setPaused(true);};update();media.addEventListener('change',update);return()=>media.removeEventListener('change',update);},[]);
  const m=personalMoment(save);if(!m)return null;
  const title=m.kind==='CHAMPION'?'한국시리즈 우승':m.kind==='HOME_RUN'?`${m.walkoff?'끝내기 ':''}${m.grandSlam?'만루 ':''}홈런`:m.kind==='CATCH'?'슈퍼 캐치':'탈삼진';
  return <section className="momentTheater" aria-label="나의 명장면"><p className="eyebrow">{m.stage} · {m.inning}회 · {m.outs}아웃</p><h2>{m.name}의 {title}</h2>
    <ReplayStage key={`${m.id}-${replay}`} kind={m.kind} paused={paused} speed={slow?.5:1} title={title} playerName={m.name}/>
    <div className="replayControls"><button onClick={()=>setPaused(!paused)}>{paused?'명장면 재생':'일시정지'}</button><button onClick={()=>{setReplay(replay+1);setPaused(false);}}>명장면 다시 재생</button><button aria-pressed={slow} onClick={()=>setSlow(!slow)}>느리게 보기</button><button onClick={()=>document.querySelector('.replayStage')?.requestFullscreen()}>크게 보기</button><span>{m.before} → {m.after}</span></div>
    <p className="footnote">실제 포스트시즌 기록의 장면 · 화면에 보이는 동안 반복 재생됩니다.</p>
  </section>;
}
