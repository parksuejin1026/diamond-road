'use client';
import { useState } from 'react';
import type { CareerSave } from '../engine/career';
import PixelPlayer from './pixel/PixelPlayer';
import PixelBallpark from './pixel/PixelBallpark';
export default function MomentTheater({save}:{save:CareerSave}){
  const [index,setIndex]=useState(0),[playing,setPlaying]=useState(false);
  const moments=(save.moments??[]).filter(m=>m.year===save.year);
  if(!moments.length)return null;
  const m=moments[Math.min(index,moments.length-1)];
  return <section className="momentTheater"><p className="eyebrow">OCTOBER · {m.stage}</p><h3>{m.walkoff?'끝내기 ':''}{m.grandSlam?'만루 ':''}{m.kind==='CHAMPION'?'한국시리즈 우승':m.kind==='HOME_RUN'?'홈런':m.kind==='CATCH'?'슈퍼 캐치':'삼진'}</h3><p>{m.name} · {m.inning}회 · {m.outs}아웃 · {m.bases}명 출루</p><div key={`${m.id}-${playing}`} className={`momentScene ${playing?'playing':''} action-${m.kind}`}><PixelBallpark/><div className="momentActor"><PixelPlayer role={m.kind==='STRIKEOUT'?'PITCHER':'HITTER'} variant={save.life?.appearance}/></div>{m.kind==='CHAMPION'&&<div className="championConfetti">◆ ✦ ◆ ✦ ◆ ✦ ◆</div>}<i className="momentBall"/><span className="momentImpact">{m.kind==='CHAMPION'?'WE ARE CHAMPIONS!':m.kind==='CATCH'?'SUPER CATCH!':m.walkoff?'WALK OFF!':m.kind==='HOME_RUN'?'HOME RUN!':'STRIKE THREE!'}</span></div><p>{m.before} → {m.after}</p><div className="actions"><button onClick={()=>setPlaying(!playing)}>{playing?'연출 정지':'명장면 재생'}</button><button onClick={()=>{setIndex((index+1)%moments.length);setPlaying(false);}}>다음 장면 · {index+1}/{moments.length}</button></div><p className="footnote">실제 포스트시즌 결과를 재생합니다.</p></section>;
}
