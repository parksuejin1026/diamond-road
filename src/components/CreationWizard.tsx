'use client';
import { useRef, useState } from 'react';
import { createCareer, type CareerSave } from '../engine/career';
import type { Role, FieldPosition } from '../domain/types';
import { PLAYER_STYLES } from '../engine/roster';
import { FIELD_POSITIONS } from '../engine/positions';
import { SCHOOLS, SCHOOL_SOURCE } from '../engine/schools';
import { TEAMS } from '../engine/schedule';
import SchoolPicker from './SchoolPicker';
import PixelPlayer from './pixel/PixelPlayer';
import PixelBallpark from './pixel/PixelBallpark';
const labels: Record<string,string> = {contact:'컨택',power:'파워',eye:'선구안',speed:'주력',defense:'수비',mental:'멘탈',velocity:'구속',control:'제구',breaking:'변화구',stamina:'체력'};
const stages = ['선수의 탄생','나의 야구 인생','커리어 시작'];
export default function CreationWizard({busy,onCreate,onError}:{busy:boolean;onCreate:(save:CareerSave)=>Promise<void>;onError:(message:string)=>void}) {
  const [step,setStep]=useState(0); const [name,setName]=useState(''); const [role,setRole]=useState<Role>('HITTER');
  const [style,setStyle]=useState(0); const [schoolId,setSchoolId]=useState(SCHOOLS.find(s=>s.name==='덕수고')!.id);
  const [position,setPosition]=useState<FieldPosition>('DH'); const [focus,setFocus]=useState('contact');
  const [hand,setHand]=useState<'LEFT'|'RIGHT'>('RIGHT'); const [teamId,setTeamId]=useState(TEAMS[0].id);
  const heading=useRef<HTMLHeadingElement>(null); const school=SCHOOLS.find(s=>s.id===schoolId)!; const profile=PLAYER_STYLES[role][style];
  function move(next:number){setStep(next);requestAnimationFrame(()=>heading.current?.focus());}
  return <section className="creationLayout"><aside className="playerPreview" aria-label="선수 미리보기"><PixelBallpark school/><div className="previewPortrait"><PixelPlayer role={role}/><div><p className="eyebrow">YOUR FIRST CHAPTER</p><h2>{name.trim()||'이름 없는 신인'}</h2><p>{school.name} · 16세<br/>{role==='HITTER'?FIELD_POSITIONS.find(p=>p.id===position)?.name:'투수'} · {profile.name}</p><strong className="previewRating">OVR 45</strong></div></div><div className="previewSkills">{Object.entries(profile.skills).map(([key,value])=><span key={key}>{labels[key]} <strong>{value}</strong></span>)}</div><p className="cardCaption">벤치의 신인에서, 모두가 기억하는 전설로.</p></aside><form className="panel creationForm" onSubmit={async e=>{e.preventDefault();if(step<2){move(step+1);return;}try{await onCreate(createCareer({name,role,teamId,schoolId,position:role==='HITTER'?position:undefined,style,focus,hand},crypto.getRandomValues(new Uint32Array(1))[0]));}catch(error){onError(error instanceof Error?error.message:'선수를 만들지 못했습니다.');}}}>
    <ol className="creationProgress" aria-label="선수 생성 단계">{stages.map((stage,i)=><li key={stage} aria-current={step===i?'step':undefined}><span>{i<step?'✓':`0${i+1}`}</span>{stage}</li>)}</ol><p className="eyebrow">STEP {step+1} / 3</p><h2 ref={heading} tabIndex={-1}>{stages[step]}</h2>
    <div hidden={step!==0}><p>첫 유니폼에 새길 이름을 알려주세요.</p><label>선수 이름<input name="name" value={name} onChange={e=>setName(e.target.value)} maxLength={12} required pattern=".*\S.*" placeholder="이름을 입력하세요" autoComplete="off"/></label><fieldset><legend>선수 역할</legend><div className="roles">{(['HITTER','PITCHER'] as Role[]).map(r=><label key={r} className={role===r?'selected role':'role'}><input type="radio" name="role" checked={role===r} onChange={()=>{setRole(r);setStyle(0);setFocus(r==='HITTER'?'contact':'control');setHand('RIGHT');}}/><PixelPlayer role={r}/><strong>{r==='HITTER'?'타자':'투수'}</strong><span>{r==='HITTER'?'한 번의 스윙으로 쓰는 이야기':'마운드에서 시작하는 승부'}</span></label>)}</div></fieldset></div>
    <div hidden={step!==1}><p>첫 운동장과 나만의 강점을 선택하세요.</p><SchoolPicker value={schoolId} onChange={setSchoolId}/>{role==='HITTER'&&<div className="fields"><label>수비 포지션<select value={position} onChange={e=>setPosition(e.target.value as FieldPosition)}>{FIELD_POSITIONS.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label><label>타격 방향<select value={hand} onChange={e=>setHand(e.target.value as 'LEFT'|'RIGHT')}><option value="RIGHT">우타</option><option value="LEFT">좌타</option></select></label></div>}<fieldset><legend>플레이 스타일 · 시작 OVR 45</legend><div className="styleOptions">{PLAYER_STYLES[role].map((s,i)=><button key={s.name} type="button" aria-pressed={style===i} onClick={()=>setStyle(i)}><strong>{s.name}</strong><span>{s.description}</span></button>)}</div></fieldset></div>
    <div hidden={step!==2}><div className="creationSummary"><strong>{name} · {role==='HITTER'?'타자':'투수'}</strong><p>{school.region} · {school.name}<br/>{profile.name} · 16세 · 벤치에서 출발</p><span>고교 3년 → 드래프트 → KBO → 은퇴</span></div><label>집중 육성<select value={focus} onChange={e=>setFocus(e.target.value)}>{Object.keys(profile.skills).map(key=><option key={key} value={key}>{labels[key]}</option>)}</select></label><label>응원하는 KBO 구단<select value={teamId} onChange={e=>setTeamId(e.target.value)}>{TEAMS.map(team=><option key={team.id} value={team.id}>{team.name}</option>)}</select></label><p>경기는 자동으로 진행됩니다. 시즌 전 훈련과 아이템을 준비하고 커리어의 중요한 선택에 집중하세요.</p></div>
    <div className="wizardActions">{step>0&&<button type="button" disabled={busy} onClick={()=>move(step-1)}>← 이전 단계</button>}<button className="primary" disabled={busy}>{busy?'저장 중…':step===2?'나의 커리어 시작하기 →':'다음 단계 →'}</button></div><p className="footnote">브라우저 자동 저장 · 가입 없이 플레이</p>{step===1&&<details><summary>등록 팀 출처</summary><p><a href={SCHOOL_SOURCE} target="_blank" rel="noreferrer">대한야구소프트볼협회 2026 U18 팀정보</a> · 104팀. 선수와 경기는 게임 속 설정입니다.</p></details>}
  </form></section>;
}
