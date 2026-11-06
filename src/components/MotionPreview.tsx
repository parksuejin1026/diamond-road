'use client';
import {useEffect,useState} from 'react';
import ReplayStage from './ReplayStage';
import type {ReplayKind} from '../game/replay/timeline';
const motions:readonly [ReplayKind,string][]=[['HOME_RUN','타격'],['STRIKEOUT','투구'],['CATCH','수비'],['RUN','주루'],['CHAMPION','환호']];
export default function MotionPreview(){
  const [kind,setKind]=useState<ReplayKind>('HOME_RUN'),[paused,setPaused]=useState(false),[slow,setSlow]=useState(false),[replay,setReplay]=useState(0);
  useEffect(()=>{if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)setPaused(true);},[]);
  const title=kind==='HOME_RUN'?'홈런':kind==='STRIKEOUT'?'탈삼진':kind==='CATCH'?'슈퍼 캐치':kind==='RUN'?'전력 질주':'우승의 순간';
  return <main className="motionPreviewPage"><a href={`${process.env.NEXT_PUBLIC_BASE_PATH??''}/`}>← 게임으로</a><p className="eyebrow">DIAMOND ROAD · AT THE BALLPARK</p><h1>선수의 움직임을 확인하세요</h1><p>타격부터 마운드 위의 승부까지. 동작을 선택하면 경기 장면이 반복 재생됩니다.</p>
    <div className="motionTabs" role="group" aria-label="동작 선택">{motions.map(([value,label])=><button key={value} aria-pressed={kind===value} onClick={()=>{setKind(value);setReplay(replay+1);}}>{label}</button>)}</div>
    <ReplayStage key={`${kind}-${replay}`} kind={kind} paused={paused} speed={slow?.5:1} title={title} playerName="다이아몬드 루키"/>
    <div className="replayControls"><button onClick={()=>setPaused(!paused)}>{paused?'재생':'일시정지'}</button><button onClick={()=>{setReplay(replay+1);setPaused(false);}}>처음부터 재생</button><button aria-pressed={slow} onClick={()=>setSlow(!slow)}>느리게 보기</button><button onClick={()=>document.querySelector('.replayStage')?.requestFullscreen()}>크게 보기</button></div>
  </main>;
}
