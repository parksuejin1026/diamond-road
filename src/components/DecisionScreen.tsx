'use client';
import TurningPointScreen from './TurningPointScreen';
import {useEffect,useRef,useState} from 'react';
import type {CareerSave} from '../engine/career';
import {acknowledge,resolveTournament,type Decision} from '../engine/decisions';
import {answerMeeting} from '../engine/life';
import {PLAYER_STYLES} from '../engine/roster';
import {UNIVERSITIES} from '../engine/schools';
import {educationLabel,enrollUniversity,nextSchoolYear,teamName} from '../engine/youth';
import {applyMilitary} from '../engine/international';
import {EVENTS,chooseEvent} from '../engine/events';
import ContractPanel from './ContractPanel';
import MomentTheater from './MomentTheater';
import TeamMark from './TeamMark';
import AsianGamesPanel from './AsianGamesPanel';
import {WorldTournamentResult} from './InternationalPanel';
export default function DecisionScreen({save,busy,update,kind}:{save:CareerSave;busy:boolean;update:(s:CareerSave)=>void;kind:Decision}){
 const [university,setUniversity]=useState(UNIVERSITIES[0].id),[search,setSearch]=useState('');
 const heading=useRef<HTMLHeadingElement>(null);useEffect(()=>{heading.current?.focus();window.scrollTo(0,0);},[kind,save.year]);
 const titles:Record<Decision,string>={TURNING_POINT:'커리어의 새로운 가능성',TURNING_RESULT:'전환점의 선택',CAREER_EVENT:'당신의 선택을 기다립니다',MEETING:'감독과의 면담',MOMENT:'나의 가을 야구 명장면',ASIAN:'아시안게임 대표팀 도전',WORLD:'세계 야구 대회 대표팀 도전',ASIAN_RESULT:'아시안게임 결과',WORLD_RESULT:'세계 야구 대회 결과',CONTRACT:save.pendingTrade?'트레이드 제안':'새 시즌의 계약을 선택하세요',MILITARY:'병역 진로를 선택하세요',MILITARY_RESULT:'병역 진행 결과',EDUCATION:`${educationLabel(save)} 졸업, 다음 무대를 정하세요`};
 const event=EVENTS.find(e=>e.id===save.pendingEvent),meeting=save.life?.meeting;
 return <main className="decisionPage"><section className="decisionCard" aria-labelledby="decisionTitle"><p className="eyebrow">{save.year} · {save.player.name} · CAREER DECISION</p><h1 id="decisionTitle" ref={heading} tabIndex={-1}>{titles[kind]}</h1>
 {(kind==='TURNING_POINT'||kind==='TURNING_RESULT')&&<TurningPointScreen save={save} busy={busy} update={update} result={kind==='TURNING_RESULT'}/>}
 {kind==='CAREER_EVENT'&&event&&<><h2>{event.title}</h2><p>{event.description}</p><div className="decisionOptions">{event.choices.map((c,i)=><button key={i} disabled={busy} onClick={()=>update(chooseEvent(save,event.id,i))}>{c.label}</button>)}</div></>}
 {kind==='MEETING'&&meeting&&<><p>새 시즌의 방향을 함께 결정합니다.</p><div className="decisionOptions">{meeting.style!==undefined&&<button disabled={busy} onClick={()=>update(answerMeeting(save,'style',true))}>{PLAYER_STYLES[save.player.role][meeting.style].name} 특성 변경 수락</button>}{meeting.position&&<button disabled={busy} onClick={()=>update(answerMeeting(save,'position',true))}>{meeting.position} 포지션 전환 {meeting.selfRequest?'요청':'수락'}</button>}<button disabled={busy} onClick={()=>update(answerMeeting(save,'style',false))}>현재 방향 유지</button></div></>}
 {kind==='MOMENT'&&<><MomentTheater save={save}/><button className="primary" disabled={busy} onClick={()=>update(acknowledge(save,'MOMENT'))}>명장면 확인 · 다음으로 →</button></>}
 {(kind==='ASIAN'||kind==='WORLD')&&<><p>대표팀 선발에 도전할까요? 참가를 선택하면 시즌 성적과 능력에 따라 선발을 심사하고 대회를 진행합니다.</p><p>도전을 보류하면 대표팀에 참가하지 않고 국내 커리어를 이어갑니다.</p><div className="decisionOptions"><button className="primary" disabled={busy} onClick={()=>update(resolveTournament(save,kind,true))}>대표팀 도전 · 선발 심사</button><button disabled={busy} onClick={()=>update(resolveTournament(save,kind,false))}>이번 대회 도전 보류</button></div></>}
 {kind==='ASIAN_RESULT'&&<><AsianGamesPanel save={save}/><button className="primary" disabled={busy} onClick={()=>update(acknowledge(save,kind))}>대회 결과 확인 · 다음으로 →</button></>}
 {kind==='WORLD_RESULT'&&<><WorldTournamentResult save={save}/><button className="primary" disabled={busy} onClick={()=>update(acknowledge(save,kind))}>대회 결과 확인 · 다음으로 →</button></>}
 {kind==='MILITARY'&&<><p>상무 선발에 지원하거나 일반 복무를 선택할 수 있습니다. 복무를 시작하면 두 시즌의 프로 공백 후 복귀합니다.</p><div className="decisionOptions"><button disabled={busy} onClick={()=>update({...applyMilitary(save,true),requestedDecision:undefined})}>상무 지원 · 선발 심사</button><button disabled={busy} onClick={()=>update({...applyMilitary(save,false),requestedDecision:undefined})}>일반 복무 선택</button><button disabled={busy} onClick={()=>update({...save,requestedDecision:undefined})}>이번에는 결정 보류</button></div></>}
 {kind==='MILITARY_RESULT'&&<><p>{save.military?.history.filter(h=>h.year===save.year).at(-1)?.text}</p><button className="primary" disabled={busy} onClick={()=>update(acknowledge(save,'MILITARY_RESULT'))}>병역 결과 확인 · 다음으로 →</button></>}
 {kind==='CONTRACT'&&<><p><TeamMark id={save.player.teamId}/>{teamName(save.player.teamId)} · 계약 조건을 확인하고 직접 결정해 주세요.</p><ContractPanel save={save} busy={busy} update={update}/></>}
 {kind==='EDUCATION'&&<><p>{save.youth?.level==='UNIVERSITY'?'대학에서 쌓은 기록으로 프로 신인 드래프트에 도전합니다.':'프로 신인 드래프트에 바로 도전하거나 대학 야구에서 4년간 더 성장할 수 있습니다.'}</p><button className="primary" disabled={busy} onClick={()=>update(nextSchoolYear(save))}>신인 드래프트 참가 →</button>{save.youth?.level!=='UNIVERSITY'&&<section className="universityChoice"><h2>대학 야구로 진학</h2><label>대학교 검색<input value={search} onChange={e=>setSearch(e.target.value)} placeholder="학교 이름 또는 지역"/></label><label>진학할 대학교<select value={university} onChange={e=>setUniversity(e.target.value)}>{UNIVERSITIES.filter(t=>t.id===university||`${t.name} ${t.region}`.includes(search)).map(t=><option key={t.id} value={t.id}>{t.name} · {t.region}</option>)}</select></label><p>대학 1~4학년 리그·전국대회 → 대학 졸업 후 드래프트</p><button disabled={busy} onClick={()=>update(enrollUniversity(save,university))}>선택한 대학교로 진학 →</button><p className="footnote">진학 심사와 학제는 게임 진행을 위해 4년 과정으로 통일했습니다.</p></section>}</>}
 </section></main>;
}
