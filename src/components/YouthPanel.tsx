import DraftReveal from './DraftReveal';
import { contractMoney } from '../engine/life';
import type { CareerSave } from '../engine/career';
import { isYouth, teamName, signDraft } from '../engine/youth';
import { overall } from '../domain/calculators';
const labels: Record<string, string> = { contact: '컨택', power: '파워', eye: '선구안', speed: '주력', defense: '수비', mental: '정신력', velocity: '구속', control: '제구', breaking: '변화구', stamina: '체력' };
export default function YouthPanel({ save, busy, update }: { save: CareerSave; busy: boolean; update: (save: CareerSave) => void }) {
  const youth = save.youth; if (!youth) return null;
  const last = youth.history.at(-1);
  if(save.phase==='DRAFT'&&youth.draft)return <DraftReveal save={save} busy={busy} update={update}/>;
  return <section className="youthPanel">
    {isYouth(save) && <><div className="careerSteps"><span className={youth.trust < 55 ? 'current' : ''}>벤치의 신입생</span><span className={youth.trust >= 55 ? 'current' : ''}>주전 경쟁</span><span>드래프트</span><span>KBO 무대</span></div>
      <div className="trust"><span>감독 신뢰도 <strong>{youth.trust} / 100</strong></span><meter min={0} max={100} value={youth.trust} aria-label="감독 신뢰도" /><p>시즌 출전을 통해 기회를 얻습니다. 신뢰도 55부터 주전 기회가 열립니다.</p></div>
      <p className="footnote">처음 고른 플레이스타일을 따라 시즌마다 자동으로 성장합니다.</p></>}
    {isYouth(save) && save.phase === 'SEASON_RESULT' && last && <div className="growthCard"><p className="eyebrow">YEAR {last.grade} · GROWTH REPORT</p><h2>이번 학년, 이만큼 자랐습니다.</h2><div className="growthOvr">OVR {last.beforeOvr} <span>→</span> {last.afterOvr}</div><div className="growthGrid">{Object.entries(last.afterSkills).map(([k, v]) => <div key={k}><span>{labels[k]}</span><strong>{last.beforeSkills[k]} → {v}</strong><em>+{v - last.beforeSkills[k]}</em></div>)}</div></div>}
    {isYouth(save) && youth.cups && youth.cups.length > 0 && <details open><summary>고교 전국대회 결과</summary>{youth.cups.map(c => <div className="cup" key={c.name}><strong>{c.name}</strong><span>우승 · {teamName(c.champion)}</span><small>{teamName(youth.schoolId)} {c.games.filter(g => g.homeTeamId === youth.schoolId || g.awayTeamId === youth.schoolId).length}경기 · 나의 기록 {c.hitter ? `${c.hitter.h}안타 ${c.hitter.hr}홈런` : `${c.pitcher?.so ?? 0}탈삼진`}</small></div>)}<p className="footnote">실제 등록 팀을 활용한 게임 내 대진입니다. 대회 참가 자격과 일정은 게임 진행을 위해 간소화했습니다.</p></details>}
    {youth.history.length > 0 && <details><summary>나의 고교 기록 · {teamName(youth.schoolId)}</summary>{youth.history.map(y => <p key={y.year}>{y.grade}학년 · {y.year} · OVR {y.beforeOvr} → {y.afterOvr} · {y.hitter ? `${y.hitter.g}경기 ${y.hitter.h}안타 ${y.hitter.hr}홈런` : `${y.pitcher?.g}경기 ${y.pitcher?.so}탈삼진`}</p>)}</details>}
    {youth.graduated && <p className="schoolOrigin">{teamName(youth.schoolId)} 출신 · {youth.draft?.round ? `${youth.draft.round}라운드 · 전체 ${youth.draft.overallPick}순위 지명` : '육성선수로 프로 입단'}</p>}
  </section>;
}
