'use client';
import LegacyExtras from './LegacyExtras';
import { contractMoney } from '../engine/life';
import { useState } from 'react';
import type { CareerSave } from '../engine/career';
import { teamName } from '../engine/youth';
import { legacyGrade } from '../engine/awards';
import CareerGoal from './CareerGoal';
import PixelPlayer from './pixel/PixelPlayer';
export default function LegacySummary({ save, onNewCareer }: { save: CareerSave; onNewCareer: () => void }) {
  const [chapter, setChapter] = useState(0);
  const clubs = [...new Set(save.seasons.map(season => season.teamId))];
  const best = [...save.seasons].sort((a,b) => ((b.hitter?.h ?? 0) + (b.hitter?.hr ?? 0)*8 + (b.pitcher?.so ?? 0) + (b.pitcher?.wins ?? 0)*12) - ((a.hitter?.h ?? 0) + (a.hitter?.hr ?? 0)*8 + (a.pitcher?.so ?? 0) + (a.pitcher?.wins ?? 0)*12))[0];
  const loyal = clubs.find(id => save.seasons.filter(season => season.teamId === id).length >= save.seasons.length * .6);
  const story = loyal ? `${teamName(loyal)}의 상징` : clubs.length >= 4 ? '여러 유니폼에 남긴 발자국' : save.player.role === 'HITTER' ? '타석에서 쓴 나의 이야기' : '마운드에서 쓴 나의 이야기';
  return <section className="legacySummary"><p className="eyebrow">A CAREER TO REMEMBER</p><div className="legacyPortrait"><PixelPlayer role={save.player.role} accent="#f4b950" /><div><h1>{save.player.name}</h1><strong>{legacyGrade(save.seasons).grade}</strong><p>{story}<br />{save.player.age}세 은퇴 · 프로 {save.seasons.length}시즌</p></div></div><div className="subTabs" role="group" aria-label="커리어 회고">{['하이라이트','연대기','유니폼'].map((label,i)=><button key={label} aria-pressed={chapter===i} onClick={()=>setChapter(i)}>{label}</button>)}</div>{chapter === 0 && <><CareerGoal save={save} /><div className="homeStats"><div><span>우승</span><strong>{save.seasons.filter(season=>season.championship).length}</strong></div><div><span>개인상</span><strong>{save.seasons.reduce((n,s)=>n+(s.awards?.length??0),0)}</strong></div><div><span>최고 OVR</span><strong>{Math.max(45,...save.seasons.map(s=>s.ovr))}</strong></div><div><span>대표팀 메달</span><strong>{save.asianGames?.filter(r=>r.selected&&r.medal).length??0}</strong></div></div>{best && <p>최고의 시즌 · {best.year}<br />{best.hitter ? `${best.hitter.h}안타 · ${best.hitter.hr}홈런 · ${best.hitter.rbi}타점` : `${best.pitcher?.wins??0}승 · ${best.pitcher?.so??0}탈삼진`}</p>}</>}{chapter === 1 && <div className="timeline">{save.youth?.history.map(s=><p key={s.year}>{s.year} · 고교 {s.grade}학년 · OVR {s.beforeOvr} → {s.afterOvr}</p>)}{save.seasons.map(s=><p key={s.year}>{s.year} · {teamName(s.teamId)} · OVR {s.ovr}<br />{s.awards?.join(' · ') || '한 시즌의 기록을 남겼습니다.'}</p>)}</div>}{chapter === 2 && <div className="timeline"><p>기록된 정산 합계 · {contractMoney((save.contractSettlements?.reduce((n,s)=>n+s.salaryCR+s.signingBonusCR+s.optionBonusCR,0)??0))}</p>{clubs.map(id=><p key={id}><strong>{teamName(id)}</strong> · {save.seasons.filter(s=>s.teamId===id).length}시즌</p>)}{save.youth && <p>그 시작은 {teamName(save.youth.schoolId)}의 벤치였습니다.</p>}</div>}<LegacyExtras save={save}/><button className="primary" onClick={onNewCareer}>새로운 야구 인생 시작</button></section>;
}
