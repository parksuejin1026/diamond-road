'use client';
import { useRef, useState } from 'react';
import type { CareerSave } from '../engine/career';
import { advanceRound, nextSeason, standings, emptyHitter, emptyPitcher, pendingPaId, resolveHighlight, retire } from '../engine/season';
import { isYouth, teamName, seasonRounds } from '../engine/youth';
import YouthPanel from './YouthPanel';
import { hitterRates, pitcherRates } from '../domain/calculators';
import { saveCareer } from '../persistence/career';
import type { PAResult } from '../domain/types';
import MiniGame from './MiniGame';
import { RESULT_LABELS } from '../engine/miniGame';
import { EVENTS, chooseEvent } from '../engine/events';
import { signContract } from '../engine/contracts';
import { legacyGrade } from '../engine/awards';
import StatsDetails from './StatsDetails';
import SeasonNarrative from './SeasonNarrative';
export default function SeasonPanel({ save, busy, onChange, onBusy, onError }: { save: CareerSave; busy: boolean; onChange: (save: CareerSave) => void; onBusy: (busy: boolean) => void; onError: (error: string) => void }) {
  const rounds = seasonRounds(save); const youth = isYouth(save);
  const groupIds = new Set(save.schedule.filter(g => g.homeTeamId === save.player.teamId || g.awayTeamId === save.player.teamId).flatMap(g => [g.homeTeamId, g.awayTeamId]));
  const running = useRef(false);
  const stop = useRef(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [interactive, setInteractive] = useState(true);
  async function update(next: CareerSave) {
    if (running.current || busy) return;
    running.current = true; onBusy(true); onError('');
    try { await saveCareer(next); onChange(next); }
    catch { onError('저장하지 못했습니다. 다시 시도해 주세요.'); }
    finally { running.current = false; onBusy(false); }
  }
  async function run(until: number) {
    if (running.current || busy) return;
    running.current = true; stop.current = false; onBusy(true); onError('');
    let current = save;
    try {
      while (current.league.round < until && !stop.current) {
        const next = advanceRound(current, { interactive });
        if (next === current) break;
        // Persist every complete round before publishing it to the screen.
        await saveCareer(next); current = next; onChange(current); setProgress(current.league.round);
        if (current.phase === 'HIGHLIGHT_READY' || current.pendingEvent) break;
        await new Promise<void>(resolve => setTimeout(resolve, 0));
      }
    } catch (e) { onError(e instanceof Error ? e.message : '진행하지 못했습니다. 마지막 저장 라운드에서 다시 시도해 주세요.'); }
    finally { running.current = false; setProgress(null); onBusy(false); }
  }
  async function proceed() {
    if (running.current || busy) return;
    running.current = true; onBusy(true); onError('');
    try { const next = nextSeason(save); await saveCareer(next); onChange(next); }
    catch { onError('다음 시즌을 저장하지 못했습니다. 다시 시도해 주세요.'); }
    finally { running.current = false; onBusy(false); }
  }
  const h = save.league.hitters[save.player.id]; const p = save.league.pitchers[save.player.id];
  const hr = h ? hitterRates(h) : null; const pr = p ? pitcherRates(p) : null;
  const totalH = save.seasons.reduce((a, s) => { if (s.hitter) for (const k of Object.keys(a) as (keyof typeof a)[]) a[k] = (a[k] ?? 0) + (s.hitter[k] ?? 0); return a; }, emptyHitter());
  const totalP = save.seasons.reduce((a, s) => { if (s.pitcher) for (const k of Object.keys(a) as (keyof typeof a)[]) a[k] += s.pitcher[k]; return a; }, emptyPitcher());
  const bestSeason = [...save.seasons].sort((a, b) => {
    const score = (s: typeof a) => s.hitter ? s.hitter.h + s.hitter.hr * 8 : (s.pitcher?.outs ?? 0) + (s.pitcher?.so ?? 0) * 2 - (s.pitcher?.er ?? 0) * 3;
    return score(b) - score(a);
  })[0];
  if (save.phase === 'DRAFT') return <section className="season"><YouthPanel save={save} busy={busy} update={update} /></section>;
  return <section className="season">
    <YouthPanel save={save} busy={busy} update={update} />
    <h3>{save.phase === 'RETIRED' ? '커리어 기록' : save.phase === 'SEASON_RESULT' ? youth ? '고교 시즌 결산' : '정규 시즌 결산' : youth ? '고교 주말리그' : '정규 시즌'}</h3>
    <p>{save.year}년 · {save.league.round} / {rounds} 라운드 · {save.league.results.length} / {save.schedule.length} 경기</p>
    <progress max={rounds} value={progress ?? save.league.round} aria-label="정규 시즌 진행률" />
    <p className="footnote">이번 시즌 중요 상황 {save.highlightCount} / 3회</p>
    <p className="footnote">건강 {save.player.health} · 피로 {save.player.fatigue} · 명성 {save.player.reputation ?? 0}{save.player.rosterStatus === 'INJURED' ? ` · 부상: ${save.player.injuredUntil}라운드 복귀 예정` : save.player.rosterStatus === 'MINORS' ? ` · 2군 ${save.player.minorGames ?? 0}경기 육성 중 · OVR 60 또는 이벤트로 복귀` : ''}</p>
    {save.pendingEvent && (() => { const event = EVENTS.find(e => e.id === save.pendingEvent)!; return <div className="notice"><p className="eyebrow">CAREER EVENT</p><h3>{event.title}</h3><p>{event.description}</p><div className="actions">{event.choices.map((choice, i) => <button disabled={busy} key={i} onClick={() => update(chooseEvent(save, event.id, i))}>{choice.label}</button>)}</div></div>; })()}
    {save.phase === 'HIGHLIGHT_READY' && <div className="notice"><strong>중요한 순간입니다</strong><p>{save.pendingGame!.game.inning}회 · 직접 승부할 준비가 되었나요?</p><div className="actions"><button disabled={busy} onClick={() => update({ ...save, phase: 'MINI_GAME' })}>직접 플레이</button><button disabled={busy} onClick={() => update(resolveHighlight(save, pendingPaId(save)!))}>이 타석 자동 진행</button></div></div>}
    {save.phase === 'MINI_GAME' && <MiniGame key={pendingPaId(save)} save={save} onFinish={(result?: PAResult, state?: number, pitches?: number) => update(resolveHighlight(save, pendingPaId(save)!, result, state, pitches))} />}
    {save.lastHighlight && save.phase === 'SIMULATING' && <div className="notice" role="status"><strong>직접 승부 결과: {RESULT_LABELS[save.lastHighlight.result]}</strong><p>원정 : 홈 {save.lastHighlight.before.away}:{save.lastHighlight.before.home} → {save.lastHighlight.after.away}:{save.lastHighlight.after.home} · 선수 기록 반영 완료</p></div>}
    <div className="statline">{h && hr ? <><strong>AVG {hr.avg.toFixed(3)}</strong><span>{h.g}경기 · {h.pa}타석 · {h.h}안타 · {h.hr}홈런 · {h.rbi}타점</span><span>OBP {hr.obp.toFixed(3)} · SLG {hr.slg.toFixed(3)} · OPS {hr.ops.toFixed(3)}</span></> : p && pr ? <><strong>ERA {pr.era?.toFixed(2) ?? '—'}</strong><span>{p.g}경기 · {p.gs}선발 · {Math.floor(p.outs / 3)}.{p.outs % 3}이닝 · {p.wins}승 {p.losses}패</span><span>{p.so}탈삼진 · {p.er}자책점 · WHIP {pr.whip?.toFixed(2) ?? '—'}</span></> : null}</div>
    <StatsDetails hitter={h} pitcher={p} />
    <SeasonNarrative save={save} />
    {['PRESEASON', 'SIMULATING'].includes(save.phase) && !save.pendingEvent && <><label className="check"><input type="checkbox" checked={interactive} disabled={busy} onChange={e => setInteractive(e.target.checked)} />중요 상황에서 직접 플레이</label><div className="actions"><button disabled={busy} onClick={() => run(Math.min(rounds, save.league.round + 1))}>다음 라운드</button><button className="primary compact" disabled={busy} onClick={() => run(rounds)}>{progress !== null ? `${progress} / ${rounds} 진행 중…` : '시즌 끝까지 자동 진행'}</button>{progress !== null && <button onClick={() => { stop.current = true; }}>현재 라운드 후 멈추기</button>}</div></>}
    {save.phase === 'SEASON_RESULT' && save.contractOffers.length > 0 && <div className="notice"><h3>다음 계약을 선택하세요</h3><p>연봉·계약 기간·출전 기회를 비교하세요. 선택하지 않으면 현재 팀과 1년 3,000 CR 기본 계약으로 진행합니다.</p>{save.contractOffers.map((offer, i) => <button className="offer" key={offer.teamId} disabled={busy} onClick={() => update(signContract(save, i))}><strong>{teamName(offer.teamId)}</strong><span>{offer.salaryCR.toLocaleString()} CR · {offer.years}년 · {offer.opportunity === 'STARTER' ? '주전 기회' : '벤치 경쟁'}</span></button>)}</div>}
    {save.phase === 'SEASON_RESULT' && <button className="primary" disabled={busy} onClick={proceed}>{save.player.age >= 38 ? '은퇴 기록 보기' : youth ? save.youth!.grade === 3 ? '신인 드래프트 참가 →' : '다음 학년으로 →' : '성장 반영 · 다음 시즌 →'}</button>}
    {save.phase === 'SEASON_RESULT' && save.player.age >= 35 && <button className="danger" disabled={busy} onClick={() => { if (window.confirm('이번 시즌을 마지막으로 은퇴할까요?')) update(retire(save)); }}>이번 시즌을 끝으로 은퇴</button>}
    {save.phase === 'RETIRED' && <div className="notice"><p className="eyebrow">HALL OF FAME</p><h2>{legacyGrade(save.seasons).grade}</h2><p>{save.seasons.length}시즌 · 커리어 점수 {legacyGrade(save.seasons).score.toLocaleString()}</p><p>{save.seasons.filter(s => s.championship).length}회 우승 · {save.seasons.reduce((n, s) => n + (s.awards?.length ?? 0), 0)}회 개인상</p></div>}
    {save.phase === 'RETIRED' && bestSeason && <div className="notice"><strong>최고의 시즌 · {bestSeason.year}</strong><p>{bestSeason.hitter ? `${bestSeason.hitter.h}안타 · ${bestSeason.hitter.hr}홈런 · ${bestSeason.hitter.rbi}타점` : `${bestSeason.pitcher?.wins}승 · ${bestSeason.pitcher?.so}탈삼진`}</p><p>{save.seasons.flatMap(s => (s.awards ?? []).map(a => `${s.year} ${a}`)).join(' · ') || '매 시즌 쌓아 올린 기록이 당신의 유산입니다.'}</p></div>}
    {save.seasons.length > 0 && <StatsDetails title="전체 통산 기록 (완료 시즌)" hitter={save.player.role === 'HITTER' ? totalH : null} pitcher={save.player.role === 'PITCHER' ? totalP : null} />}
    {save.postseason && <details open><summary>포스트시즌 우승 · {teamName(save.postseason.champion)}</summary>{save.postseason.games.map(g => <p key={g.id}>{teamName(g.awayTeamId)} {g.away} : {g.home} {teamName(g.homeTeamId)}</p>)}</details>}
    {save.awards.length > 0 && <details><summary>리그 개인상</summary>{save.awards.map(a => <p key={a.title}>{a.title} · {save.players.find(p => p.id === a.playerId)?.name}{a.playerId === save.player.id ? ' ★' : ''}</p>)}</details>}
    <div className="tableWrap"><table><caption>{youth ? '내 권역 순위' : 'KBO 정규 시즌 순위'}</caption><thead><tr><th>순위</th><th>구단</th><th>승</th><th>패</th><th>무</th><th>승률</th></tr></thead><tbody>{standings(save.league).filter(t => !youth || groupIds.has(t.teamId)).map((t, i) => <tr key={t.teamId} className={t.teamId === save.player.teamId ? 'myTeam' : ''}><td>{i + 1}</td><th scope="row">{teamName(t.teamId)}</th><td>{t.w}</td><td>{t.l}</td><td>{t.t}</td><td>{t.w + t.l ? (t.w / (t.w + t.l)).toFixed(3) : '.000'}</td></tr>)}</tbody></table></div>
    {save.league.results.length > 0 && <details><summary>최근 우리 팀 경기</summary>{save.league.results.filter(g => g.homeTeamId === save.player.teamId || g.awayTeamId === save.player.teamId).slice(-5).reverse().map(g => <p key={g.id}>{g.round}R · {teamName(g.awayTeamId)} {g.away} : {g.home} {teamName(g.homeTeamId)} · {g.innings}회</p>)}</details>}
    {save.seasons.length > 0 && <details open={save.phase === 'RETIRED'}><summary>완료 시즌 · 통산 기록 ({save.seasons.length}시즌)</summary><p>{save.player.role === 'HITTER' ? `${totalH.h}안타 · ${totalH.hr}홈런 · ${totalH.rbi}타점 · AVG ${hitterRates(totalH).avg.toFixed(3)}` : `${totalP.wins}승 ${totalP.losses}패 · ${totalP.so}탈삼진 · ERA ${pitcherRates(totalP).era?.toFixed(2) ?? '—'}`}</p>{save.seasons.map(s => <p key={s.year}>{s.year} · {s.age}세 · {s.rank}위 · OVR {s.ovr} · {s.hitter ? `${s.hitter.h}안타 / ${s.hitter.hr}홈런` : `${s.pitcher?.wins}승 / ${s.pitcher?.so}탈삼진`}</p>)}</details>}
    <details><summary>계약 이력</summary>{save.contractHistory.map((c, i) => <p key={i}>{c.year} · {teamName(c.teamId)} · {c.salaryCR.toLocaleString()} CR · {c.years}년</p>)}</details>
    <p className="footnote">구원승은 최종 역전 시점의 투수에 부여하는 간소화 규칙을 적용합니다.</p>
  </section>;
}
