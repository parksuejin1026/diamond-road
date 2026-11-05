'use client';
import TeamMark from './TeamMark';
import PixelPlayer from './pixel/PixelPlayer';
import DraftReveal from './DraftReveal';
import ArchivePanel from './ArchivePanel';
import LifePanel from './LifePanel';
import { retire } from '../engine/season';
import { contractMoney } from '../engine/life';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { type CareerSave } from '../engine/career';

import { overall } from '../domain/calculators';
import { deleteCareer, loadCareer, saveCareer, getRecoveryNotice } from '../persistence/career';

import CreationWizard from './CreationWizard';
import LegacySummary from './LegacySummary';
import { positionName } from '../engine/positions';
import SeasonPanel from './SeasonPanel';
import CareerHome from './CareerHome';

import PositionSettings from './PositionSettings';

import { isYouth, teamName } from '../engine/youth';

const labels: Record<string, string> = { contact: '컨택', power: '파워', eye: '선구안', speed: '주력', defense: '수비', mental: '정신력', velocity: '구속', control: '제구', breaking: '변화구', stamina: '체력' };
const phaseLabels: Record<string, string> = { POSTSEASON: '포스트시즌', PRESEASON: '프리시즌', SIMULATING: '정규 시즌', HIGHLIGHT_READY: '결정적 순간', MINI_GAME: '경기 재개', SEASON_RESULT: '시즌 결산', RETIRED: '명예의 전당', DRAFT: '신인 드래프트' };
const statusLabels: Record<string, string> = { STARTER: '주전', BENCH: '벤치', MINORS: '2군', INJURED: '벤치' };
export default function CareerApp() {
  const router = useRouter(); const pathname = usePathname();
  const [save, setSave] = useState<CareerSave | null>(null);
  const [tab, setTab] = useState<'home' | 'season' | 'player' | 'records'>('home');
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { loadCareer().then(value => { setSave(value); const notice = getRecoveryNotice(); if (notice) setError(notice); }).catch(e => setError(String(e.message))).finally(() => setReady(true)); }, []);
  useEffect(() => {
    if (!ready) return;
    const route = save ? '/career/' : pathname === '/' ? '/' : '/create/';
    if (pathname.replace(/\/$/, '') !== route.replace(/\/$/, '')) router.replace(route, { scroll: false });
  }, [ready, save, pathname, router]);
  async function persist(next: CareerSave) {
    setBusy(true); setError('');
    try { await saveCareer(next); setSave(next); } catch { setError('저장하지 못했습니다. 브라우저 저장 공간과 권한을 확인한 후 다시 시도해 주세요.'); } finally { setBusy(false); }
  }
  async function resetCareer() {
    if (!window.confirm('은퇴 기록을 보관하고 새로운 야구 인생을 시작할까요?')) return;
    setBusy(true); try { await deleteCareer(); setSave(null); setTab('home'); } catch { setError('저장 데이터 삭제에 실패했습니다.'); } finally { setBusy(false); }
  }
  if(ready&&save?.phase==='DRAFT'&&pathname.replace(/\/$/,'')==='/career')return <main className="draftPage">{error&&<p role="alert" className="error">{error}</p>}<DraftReveal save={save} busy={busy} update={persist}/></main>;
  return <main className={save ? `inCareer tab-${tab}` : ''}>
    <header><a href={(process.env.NEXT_PUBLIC_BASE_PATH || '') + '/'} className="brand">D<span>◆</span>R <small>DIAMOND ROAD</small></a><span className="badge">DIAMOND ROAD · CAREER</span></header>
    {error && <p role="alert" className="error">{error}</p>}
    {!ready || (save && pathname.replace(/\/$/, '') !== '/career') ? <section className="panel" role="status">커리어를 불러오는 중…</section> : save ? <section className="panel">
      <div hidden={tab !== 'player'}><div className="panelHead"><div><p className="eyebrow">{save.year} · {isYouth(save) ? `고교 ${save.youth!.grade}학년` : phaseLabels[save.phase]}</p><h2>{save.player.name} <small>{save.player.age}세 / {positionName(save.player)} · {statusLabels[save.player.rosterStatus ?? 'BENCH']}</small></h2><p><TeamMark id={save.player.teamId}/>{teamName(save.player.teamId)}{isYouth(save) ? ' · 16세부터 시작한 나의 야구' : ` · 연봉 ${contractMoney(save.player.salaryCR)}`}</p></div><div className="ovr"><span>OVR</span><strong>{overall(save.player)}</strong></div></div>
      <div className="playerPortraitPanel"><PixelPlayer role={save.player.role} variant={save.life?.appearance} number={save.life?.number}/></div><div className="skills">{Object.entries(save.player.skills).map(([key, value]) => <div key={key}><span>{labels[key]}</span><strong>{value}</strong><meter min="1" max="99" value={value} aria-label={labels[key]} /></div>)}</div>
      <PositionSettings save={save} busy={busy} onChange={persist} /></div>
      {tab === 'home' && (save.phase === 'RETIRED' ? <LegacySummary save={save} onNewCareer={resetCareer} /> : <CareerHome save={save} onSeason={() => setTab('season')} />)}
      {tab === 'season' && save.phase !== 'RETIRED' && <LifePanel save={save} busy={busy} update={persist} />}
      <div hidden={tab !== 'season' && tab !== 'records'}><SeasonPanel view={tab === 'records' ? 'records' : 'season'} save={save} busy={busy} onChange={setSave} onBusy={setBusy} onError={setError} /></div>
      <div hidden={tab !== 'records'}><details><summary>개막 라운드 대진표</summary>{save.schedule.filter(g => g.round === 1 && (!isYouth(save) || g.homeTeamId === save.player.teamId || g.awayTeamId === save.player.teamId)).map(g => <p key={g.id}>{teamName(g.awayTeamId)} <span className="muted">원정 vs 홈</span> {teamName(g.homeTeamId)}</p>)}</details>
</div>
    </section> : <><CreationWizard busy={busy} onCreate={persist} onError={setError} /><ArchivePanel/></>}
    {save && save.phase !== 'RETIRED' && (tab === 'home' || tab === 'player') && <button className="danger" disabled={busy || !!save.pendingGame} onClick={() => { if(window.confirm('은퇴하고 현재까지의 커리어를 보관할까요?')) persist(retire(save)); }}>은퇴하기</button>}
    {save && <nav className="bottomTabs" aria-label="커리어 메뉴">{([['home', '홈'], ['season', '시즌'], ['player', '선수'], ['records', '기록']] as const).map(([key, label]) => <button key={key} aria-current={tab === key ? 'page' : undefined} disabled={busy} onClick={() => setTab(key)}><span aria-hidden="true">{key === 'home' ? '⌂' : key === 'season' ? '▣' : key === 'player' ? '♙' : '▤'}</span>{label}</button>)}</nav>}
    <footer>DIAMOND ROAD <span>나만의 야구 커리어 · 자동 저장</span></footer>
  </main>;
}
