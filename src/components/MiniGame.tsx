'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { CareerSave } from '../engine/career';
import { currentMatch } from '../engine/season';
import { Rng } from '../engine/rng';
import type { PAResult } from '../domain/types';
import { emptyCount, gaugePosition, nextPitch, resolveHitterPitch, resolvePitcherPitch, RESULT_LABELS, updateCount, type Count, type Pitch, type PitchType, type Strategy } from '../engine/miniGame';
import GameCanvas, { type CanvasModel } from '../game/GameCanvas';
export default function MiniGame({ save, onFinish }: { save: CareerSave; onFinish: (result?: PAResult, rngState?: number, pitches?: number) => void }) {
  const pending = save.pendingGame!; const match = currentMatch(pending);
  const batter = save.players.find(p => p.id === match.batterId)!; const pitcher = save.players.find(p => p.id === match.pitcherId)!;
  const pitching = save.player.role === 'PITCHER';
  const rng = useRef(new Rng(save.rngState)); const countRef = useRef(emptyCount());
  const flight = useRef<{ pitch: Pitch; start: number; swing: number | null; rngBefore: number; call?: ReturnType<typeof resolvePitcherPitch> } | null>(null);
  const gaugeStart = useRef(0); const locked = useRef(false);
  const pitchHistory = useRef<PitchType[]>([]);
  const [count, setCount] = useState<Count>(emptyCount()); const [call, setCall] = useState('준비되면 시작하세요');
  const [running, setRunning] = useState(false); const [strategy, setStrategy] = useState<Strategy>('NORMAL');
  const [type, setType] = useState<PitchType>('FASTBALL'); const [zone, setZone] = useState(4); const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState(1);
  useEffect(() => { try { const saved = Number(localStorage.getItem('diamond-road-speed')); if ([.5, 1, 1.5, 2].includes(saved)) setSpeed(saved); } catch {} }, []);
  const [model, setModel] = useState<CanvasModel>({ progress: 0, flying: false, zone: 4, inZone: true, pitching, gauge: .5 });
  const finishPitch = useCallback((label: ReturnType<typeof resolveHitterPitch>) => {
    if (flight.current?.call) pitchHistory.current.push(flight.current.pitch.type);
    flight.current = null; gaugeStart.current = 0; locked.current = false;
    const next = updateCount(countRef.current, label); countRef.current = next; setCount(next); setRunning(false); setCall(RESULT_LABELS[label]);
    setModel(m => ({ ...m, flying: false }));
  }, []);
  useEffect(() => {
    function visibility() {
      if (document.hidden) { if (flight.current) rng.current.state = flight.current.rngBefore; flight.current = null; gaugeStart.current = 0; locked.current = false; setRunning(false); setPaused(true); setModel(m => ({ ...m, flying: false })); }
    }
    document.addEventListener('visibilitychange', visibility); return () => document.removeEventListener('visibilitychange', visibility);
  }, []);
  useEffect(() => {
    let frame: number;
    function tick(now: number) {
      if (flight.current && !locked.current) {
        const f = flight.current; const progress = (now - f.start) / f.pitch.duration;
        setModel(m => ({ ...m, progress, flying: true, zone: f.pitch.zone, inZone: f.pitch.inZone }));
        if (progress >= 1.23) { locked.current = true; finishPitch(f.call ?? resolveHitterPitch(f.pitch, f.swing === null ? null : f.swing - f.start - f.pitch.duration, strategy, batter.skills, pitcher.skills, rng.current)); }
      } else if (gaugeStart.current) setModel(m => ({ ...m, gauge: gaugePosition(now - gaugeStart.current) }));
      frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick); return () => cancelAnimationFrame(frame);
  }, [strategy, batter.skills, pitcher.skills, finishPitch]);
  const action = useCallback(() => {
    if (countRef.current.result || locked.current || paused) return;
    if (pitching) {
      if (flight.current) return;
      if (!gaugeStart.current) { gaugeStart.current = performance.now(); setRunning(true); setCall('가운데 초록 구간에서 멈추세요'); }
      else { const error = Math.abs(gaugePosition(performance.now() - gaugeStart.current) - .5) * 2; const rngBefore = rng.current.state; const call = resolvePitcherPitch(type, zone, error, batter.skills, pitcher.skills, rng.current, pitchHistory.current.filter(t => t === type).length); gaugeStart.current = 0; flight.current = { pitch: { type, zone, inZone: error < .55, duration: 450 }, start: performance.now(), swing: null, rngBefore, call }; setCall('투구!'); }
    } else if (!flight.current) {
      const rngBefore = rng.current.state; const pitch = nextPitch(rng.current); pitch.duration /= speed; flight.current = { pitch, start: performance.now() + 500, swing: null, rngBefore }; setRunning(true); setCall('공이 존에 도착할 때 스윙!');
    } else if (flight.current.swing === null) { flight.current.swing = performance.now(); setCall('스윙'); }
  }, [pitching, paused, type, zone, speed, batter.skills, pitcher.skills, finishPitch]);
  useEffect(() => { const key = (e: KeyboardEvent) => { if (e.code === 'Space' && !(e.target instanceof HTMLSelectElement) && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLButtonElement)) { e.preventDefault(); if (!e.repeat) action(); } }; window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key); }, [action]);
  return <div className="miniGame">
    <h3>{pitching ? '마운드 위의 승부' : '당신의 결정적 타석'}</h3>
    <p>{pending.game.inning}회{pending.game.half === 'TOP' ? '초' : '말'} · {pending.game.outs}아웃 · 원정 {pending.game.score.away} : {pending.game.score.home} 홈</p>
    <p>주자 {pending.game.bases.map((id, i) => id ? (i + 1) + '루' : '').filter(Boolean).join(' · ') || '없음'} · {pitching ? '투수' : '타자'} {save.player.name}</p>
    <GameCanvas model={model} />
    {!count.result && !pitching && <label>공 애니메이션 속도<select disabled={running} value={speed} onChange={e => { const value = Number(e.target.value); setSpeed(value); try { localStorage.setItem('diamond-road-speed', String(value)); } catch {} }}><option value={.5}>0.5배</option><option value={1}>1배</option><option value={1.5}>1.5배</option><option value={2}>2배</option></select></label>}
    <div className="count" aria-live="polite">B {count.balls} · S {count.strikes} · {count.pitches}구 <strong>{call}</strong></div>
    {paused ? <button onClick={() => { setPaused(false); setCall('중단된 공을 다시 시작하세요'); }}>다시 준비하기</button> : !count.result && <>
      {pitching ? <><label>구종<select disabled={running} value={type} onChange={e => setType(e.target.value as PitchType)}><option value="FASTBALL">직구</option><option value="SLIDER">슬라이더</option><option value="CHANGEUP">체인지업</option></select></label><fieldset disabled={running}><legend>목표 구역</legend><div className="zoneGrid">{Array.from({ length: 9 }, (_, i) => <button key={i} aria-label={'목표 구역 ' + (i + 1)} aria-pressed={zone === i} onClick={() => setZone(i)}>{i + 1}</button>)}</div></fieldset></> : <label>타격 전략<select value={strategy} disabled={running} onChange={e => setStrategy(e.target.value as Strategy)}><option value="CONTACT">컨택 · 넓은 타이밍</option><option value="NORMAL">일반</option><option value="POWER">강스윙 · 좁은 타이밍</option></select></label>}
      <button className="primary" onClick={action}>{pitching ? running ? '제구 게이지 멈추기 (Space)' : '투구 준비 (Space)' : running ? '스윙 (Space)' : '다음 공 시작 (Space)'}</button>
      {!pitching && running && <p className="footnote">입력하지 않으면 지켜봅니다. 존 밖의 공은 볼입니다.</p>}
    </>}
    {count.result && <button className="primary" onClick={() => onFinish(count.result!, rng.current.state, count.pitches)}>결과 반영 · 경기로 돌아가기</button>}
    {!count.result && <button className="skip" onClick={() => onFinish()}>이 타석 자동 진행</button>}
    {!count.result && count.pitches >= 12 && <p>12구가 넘었습니다. 자동 진행을 선택할 수 있습니다.</p>}
  </div>;
}
