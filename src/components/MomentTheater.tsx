'use client';
import {useState} from 'react';
import type {CareerSave} from '../engine/career';
import {personalMoment} from '../engine/moments';
import PixelPlayer from './pixel/PixelPlayer';
import PixelBallpark from './pixel/PixelBallpark';
export default function MomentTheater({save}:{save:CareerSave}){
 const [replay,setReplay]=useState(0),m=personalMoment(save);if(!m)return null;
 const kind=m.kind,title=kind==='CHAMPION'?'한국시리즈 우승':kind==='HOME_RUN'?`${m.walkoff?'끝내기 ':''}${m.grandSlam?'만루 ':''}홈런`:kind==='CATCH'?'슈퍼 캐치':'탈삼진';
 const motion=kind==='HOME_RUN'?'bat':kind==='STRIKEOUT'?'pitch':kind==='CATCH'?'catch':'celebrate';
 return <section className="momentTheater" aria-label="나의 명장면"><p className="eyebrow">{m.stage} · {m.inning}회 · {m.outs}아웃</p><h2>{m.name}의 {title}</h2><div key={`${m.id}-${replay}`} className={`momentScene playing action-${kind}`}><PixelBallpark/><div className="momentOpponent"><PixelPlayer role={kind==='STRIKEOUT'?'HITTER':'PITCHER'} motion={kind==='HOME_RUN'?'pitch':'idle'} accent="#754355" variant={2}/></div><div className="momentActor"><PixelPlayer role={kind==='STRIKEOUT'?'PITCHER':'HITTER'} motion={motion} variant={save.life?.appearance} number={save.life?.number}/></div><i className="momentBall"/><i className="momentDust"/><span className="momentImpact">{kind==='CHAMPION'?'CHAMPIONS!':kind==='CATCH'?'SUPER CATCH!':kind==='STRIKEOUT'?'STRIKE THREE!':m.walkoff?'WALK OFF!':'HOME RUN!'}</span>{kind==='CHAMPION'&&<div className="championConfetti">◆ ✦ ◆ ✦ ◆ ✦ ◆</div>}<span className="momentCaption">{m.stage} · {m.before} → {m.after}</span></div><p>{m.before} → {m.after} · 실제 경기 기록의 장면입니다.</p><button onClick={()=>setReplay(replay+1)}>명장면 다시 재생</button></section>;
}
