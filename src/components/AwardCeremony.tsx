'use client';
import {useEffect, useRef, useState} from 'react';
import type {CareerSave} from '../engine/career';
import {honorKey, pendingHonor} from '../engine/awardCeremony';
import {acknowledge} from '../engine/decisions';
import {hitterRates, pitcherRates} from '../domain/calculators';
import {teamName} from '../engine/youth';
import {drawActor, loadClip} from '../game/replay/assets';
import TeamMark from './TeamMark';
import AwardIcon, {awardLabel} from './AwardIcon';

function AwardFigure({still}: {still: boolean}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let disposed = false, animation = 0;
    loadClip('run').then(image => {
      const ctx = canvas.current?.getContext('2d');
      if (!ctx || disposed) return;
      const start = performance.now();
      const draw = (now: number) => {
        if (disposed) return;
        const frame = still ? 15 : Math.min(15, 10 + Math.floor((now - start) / 220));
        ctx.clearRect(0, 0, 384, 384);
        drawActor(ctx, image, {clip: 'run', frame, x: 192, floor: 366, size: 350});
        if (canvas.current) canvas.current.dataset.spriteFrame = String(frame);
        if (frame < 15) animation = requestAnimationFrame(draw);
      };
      animation = requestAnimationFrame(draw);
    }).catch(() => { if (canvas.current) canvas.current.dataset.artError = 'true'; });
    return () => { disposed = true; cancelAnimationFrame(animation); };
  }, [still]);
  return <canvas ref={canvas} width={384} height={384} role="img" aria-label="수상을 기뻐하는 선수"/>;
}

export default function AwardCeremony({save, busy, update}: {save: CareerSave; busy: boolean; update: (save: CareerSave) => void}) {
  const title = pendingHonor(save)!;
  const [finished, setFinished] = useState(false), [replay, setReplay] = useState(0), [reduced, setReduced] = useState(false);
  const glove = title.startsWith('골든글러브');
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const change = () => {setReduced(media.matches); if (media.matches) setFinished(true);};
    change(); media.addEventListener('change', change);
    const timer = setTimeout(() => setFinished(true), 5200);
    return () => {clearTimeout(timer); media.removeEventListener('change', change);};
  }, [replay, title]);
  const snapshot = save.seasons.find(season => season.year === save.year);
  const h = snapshot?.hitter ?? save.league.hitters[save.player.id], p = snapshot?.pitcher ?? save.league.pitchers[save.player.id];
  const stats = save.player.role === 'HITTER' && h
    ? `${h.g}경기 · 타율 ${hitterRates(h).avg.toFixed(3)} · ${h.hr}홈런 · ${h.rbi}타점`
    : p ? `${Math.floor(p.outs / 3)}.${p.outs % 3}이닝 · ERA ${pitcherRates(p).era?.toFixed(2) ?? '—'} · ${p.so}탈삼진` : '이번 시즌의 활약으로 남긴 영예';
  const count = save.seasons.filter(season => season.year < save.year && season.awards?.some(award => glove ? award.startsWith('골든글러브 ') : award === title)).length + 1;
  return <section className={`awardCeremony ${glove ? 'honor-glove' : 'honor-mvp'}`} aria-label={`${title} 시상식`}>
    <div className="honorToolbar"><span>{save.year} DIAMOND ROAD AWARDS</span>{!finished && <button disabled={busy} onClick={() => setFinished(true)}>연출 건너뛰기</button>}</div>
    <div key={replay} className={`honorStage ${finished ? 'honor-finished' : ''}`} data-finished={finished}>
      <div className="honorLights" aria-hidden="true"><i/><i/><i/></div>
      <p className="honorCategory">{glove ? 'GOLDEN GLOVE' : 'MOST VALUABLE PLAYER'}</p>
      <div className="honorCast"><div className="honorPlayer"><AwardFigure still={reduced || finished}/></div><div className="honorTrophy"><AwardIcon title={title}/></div></div>
      <div className="honorConfetti" aria-hidden="true">{Array.from({length: 22}, (_, i) => <i key={i} style={{left: `${(i * 43) % 100}%`, animationDelay: `${1.3 + i % 7 * .12}s`, backgroundColor: i % 3 === 0 ? '#f8f0ce' : i % 3 === 1 ? '#f4b950' : '#36c9a2'}}/>)}</div>
      <div className="honorAnnouncement"><span>{count === 1 ? '커리어 첫 수상' : `통산 ${count}번째 영예`}</span><h2>{awardLabel(title)}</h2><strong>{save.player.name}</strong><p><TeamMark id={snapshot?.teamId ?? save.player.teamId}/>{teamName(snapshot?.teamId ?? save.player.teamId)}</p></div>
      <div className="honorFloor" aria-hidden="true"/>
    </div>
    <p className="honorSeasonStats">{stats}</p><p className="footnote">{glove ? '정규시즌 포지션별 활약으로 받은 개인상입니다.' : '팀 우승과 별개로, 정규시즌 최고의 활약을 인정받았습니다.'}</p>
    <div className="honorControls"><button disabled={busy || !finished || reduced} onClick={() => {setFinished(false); setReplay(replay + 1);}}>연출 다시 보기</button><button className="primary" disabled={busy || !finished} onClick={() => update(acknowledge(save, honorKey(title)))}>수상 확인 · 다음으로 →</button></div>
  </section>;
}
