import type { CareerSave } from '../engine/career';
import { isYouth, teamName, signDraft } from '../engine/youth';
import { overall } from '../domain/calculators';
const labels: Record<string, string> = { contact: '컨택', power: '파워', eye: '선구안', speed: '주력', defense: '수비', mental: '멘탈', velocity: '구속', control: '제구', breaking: '변화구', stamina: '체력' };
export default function YouthPanel({ save, busy, update }: { save: CareerSave; busy: boolean; update: (save: CareerSave) => void }) {
  const youth = save.youth; if (!youth) return null;
  const last = youth.history.at(-1);
  if (save.phase === 'DRAFT' && youth.draft) return <section className="draftCard">
    <p className="eyebrow">THE NEXT CHAPTER</p><h2>{youth.draft.round ? '당신의 이름이 불렸습니다.' : '드래프트는 끝났지만, 야구는 계속됩니다.'}</h2>
    <p>{teamName(youth.schoolId)} · 고교 3시즌 · OVR {overall(save.player)}</p>
    <div className="draftTeam">{teamName(youth.draft.teamId)}</div>
    <p>{youth.draft.round ? `${youth.draft.round}라운드 · 전체 ${youth.draft.overallPick}순위 지명` : '육성선수 입단 테스트 제안'}</p>
    <p>계약금 {youth.draft.signingBonusCR.toLocaleString()} CR · 연봉 {(youth.draft.round ? youth.draft.salaryCR : 2000).toLocaleString()} CR</p>
    <p className="footnote">고교 활약·성장·전국대회 성과를 반영한 게임 속 드래프트 결과입니다.</p>
    <button className="primary" disabled={busy} onClick={() => update(signDraft(save))}>{youth.draft.round ? '프로 입단 계약' : '육성선수로 도전'}</button>
  </section>;
  return <section className="youthPanel">
    {isYouth(save) && <><div className="careerSteps"><span className={youth.trust < 55 ? 'current' : ''}>벤치의 신입생</span><span className={youth.trust >= 55 ? 'current' : ''}>주전 경쟁</span><span>드래프트</span><span>KBO 무대</span></div>
      <div className="trust"><span>감독 신뢰도 <strong>{youth.trust} / 100</strong></span><meter min={0} max={100} value={youth.trust} aria-label="감독 신뢰도" /><p>출전과 훈련을 통해 기회를 얻습니다. 신뢰도 55부터 주전 기회가 열립니다.</p></div>
      <p className="footnote">집중 육성: {labels[youth.focus]} · 고교 시즌 종료 시 성장에 추가 반영</p></>}
    {isYouth(save) && save.phase === 'SEASON_RESULT' && last && <div className="growthCard"><p className="eyebrow">YEAR {last.grade} · GROWTH REPORT</p><h2>이번 학년, 이만큼 자랐습니다.</h2><div className="growthOvr">OVR {last.beforeOvr} <span>→</span> {last.afterOvr}</div><div className="growthGrid">{Object.entries(last.afterSkills).map(([k, v]) => <div key={k}><span>{labels[k]}</span><strong>{last.beforeSkills[k]} → {v}</strong><em>+{v - last.beforeSkills[k]}</em></div>)}</div></div>}
    {isYouth(save) && youth.cups && youth.cups.length > 0 && <details open><summary>고교 전국대회 결과</summary>{youth.cups.map(c => <div className="cup" key={c.name}><strong>{c.name}</strong><span>우승 · {teamName(c.champion)}</span><small>{teamName(youth.schoolId)} {c.games.filter(g => g.homeTeamId === youth.schoolId || g.awayTeamId === youth.schoolId).length}경기 · 나의 기록 {c.hitter ? `${c.hitter.h}안타 ${c.hitter.hr}홈런` : `${c.pitcher?.so ?? 0}탈삼진`}</small></div>)}<p className="footnote">실제 등록 팀을 활용한 게임 내 대진입니다. 대회 참가 자격과 일정은 게임 진행을 위해 간소화했습니다.</p></details>}
    {youth.history.length > 0 && <details><summary>나의 고교 기록 · {teamName(youth.schoolId)}</summary>{youth.history.map(y => <p key={y.year}>{y.grade}학년 · {y.year} · OVR {y.beforeOvr} → {y.afterOvr} · {y.hitter ? `${y.hitter.g}경기 ${y.hitter.h}안타 ${y.hitter.hr}홈런` : `${y.pitcher?.g}경기 ${y.pitcher?.so}탈삼진`}</p>)}</details>}
    {youth.graduated && <p className="schoolOrigin">{teamName(youth.schoolId)} 출신 · {youth.draft?.round ? `${youth.draft.round}라운드 지명` : '육성선수로 프로 입단'}</p>}
  </section>;
}
