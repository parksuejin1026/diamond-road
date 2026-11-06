import StatsDetails from './StatsDetails';
import type { CareerSave } from '../engine/career';
import { military, WORLD_TEAMS } from '../engine/international';
export default function InternationalPanel({save,busy,update}:{save:CareerSave;busy:boolean;update:(s:CareerSave)=>void}){
  const state=military(save),status={PENDING:'병역 미해결',ATHLETE:'체육요원 편입',SANGMU:'상무 복무 예정',REGULAR:'일반 복무 예정',COMPLETED:'복무 완료'};
  return <section className="notice"><h3>국제대회와 병역</h3><p>{status[state.status]} · 세계대회 우승 자체는 병역 혜택 조건이 아닙니다.</p>{state.status==='PENDING'&&save.phase==='SEASON_RESULT'&&save.player.age>=19&&!(save.youth&&!save.youth.graduated)&&<div className="actions"><button disabled={busy||state.appliedYears.includes(save.year)} onClick={()=>update({...save,requestedDecision:'MILITARY'})}>병역 진로 선택 →</button></div>}{state.history.map((r,i)=><p key={i}>{r.year} · {r.text}</p>)}{save.world?.map(r=><details key={r.year} open={r.year===save.year}><summary>{r.year} 세계 야구 대회 · {r.selected?'대표팀 선발':'미선발'} · 대한민국 {r.rank}위</summary>{r.games.map(g=><p key={g.id}>{g.stage} · {WORLD_TEAMS.find(t=>t.id===g.awayTeamId)?.name} {g.away} : {g.home} {WORLD_TEAMS.find(t=>t.id===g.homeTeamId)?.name}</p>)}</details>)}</section>;
}

export function WorldTournamentResult({save}:{save:CareerSave}){
 const report=save.world?.find(r=>r.year===save.year);if(!report)return null;
 return <section className="notice" aria-label="세계대회 결과"><p className="eyebrow">TEAM KOREA · {report.year}</p><h2>{report.year} 세계 야구 대회</h2><p>{report.participated===false?'이번 대회 참가 보류':report.selected?'대한민국 대표팀 선발':'대표팀 미선발'} · 대한민국 {report.rank}위</p>{report.selected&&<StatsDetails title="나의 세계대회 기록" hitter={report.hitter} pitcher={report.pitcher}/>}<details><summary>대한민국 경기 결과</summary>{report.games.filter(g=>g.homeTeamId==='kor'||g.awayTeamId==='kor').map(g=><p key={g.id}>{g.stage} · {WORLD_TEAMS.find(t=>t.id===g.awayTeamId)?.name} {g.away} : {g.home} {WORLD_TEAMS.find(t=>t.id===g.homeTeamId)?.name}</p>)}</details></section>;
}
