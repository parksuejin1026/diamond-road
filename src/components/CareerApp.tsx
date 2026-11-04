'use client';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { createCareer, train, type CareerSave } from '../engine/career';
import { TEAMS } from '../engine/schedule';
import { overall } from '../domain/calculators';
import { deleteCareer, loadCareer, saveCareer, getRecoveryNotice } from '../persistence/career';
import type { Role } from '../domain/types';
import SeasonPanel from './SeasonPanel';
import CareerHome from './CareerHome';
import { focusSkill, selectFocus } from '../engine/development';
import { FIELD_POSITIONS, positionName } from '../engine/positions';
import PositionSettings from './PositionSettings';
import type { FieldPosition } from '../domain/types';
import SchoolPicker from './SchoolPicker';
import { SCHOOLS, SCHOOL_SOURCE } from '../engine/schools';
import { isYouth, teamName } from '../engine/youth';
import { PLAYER_STYLES } from '../engine/roster';
const labels: Record<string, string> = { contact: '컨택', power: '파워', eye: '선구안', speed: '주력', defense: '수비', mental: '멘탈', velocity: '구속', control: '제구', breaking: '변화구', stamina: '체력' };
const phaseLabels: Record<string, string> = { PRESEASON: '프리시즌', SIMULATING: '정규 시즌', HIGHLIGHT_READY: '결정적 순간', MINI_GAME: '직접 플레이', SEASON_RESULT: '시즌 결산', RETIRED: '명예의 전당', DRAFT: '신인 드래프트' };
const statusLabels: Record<string, string> = { STARTER: '주전', BENCH: '벤치', MINORS: '2군', INJURED: '부상 회복 중' };
export default function CareerApp() {
  const router = useRouter(); const pathname = usePathname();
  const [save, setSave] = useState<CareerSave | null>(null);
  const [tab, setTab] = useState<'home' | 'season' | 'player' | 'records'>('home');
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [role, setRole] = useState<Role>('HITTER');
  const [schoolId, setSchoolId] = useState(SCHOOLS.find(s => s.name === '덕수고')!.id);
  const [style, setStyle] = useState(0);
  const [position, setPosition] = useState<FieldPosition>('DH');
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
  return <main className={save ? `inCareer tab-${tab}` : ''}>
    <header><a href={(process.env.NEXT_PUBLIC_BASE_PATH || '') + '/'} className="brand">D<span>◆</span>R <small>DIAMOND ROAD</small></a><span className="badge">DIAMOND ROAD · MVP</span></header>
    {!save && <section className="intro"><p className="eyebrow">YOUR CAREER. YOUR DIAMOND.</p><h1>전설의 시작은,<br /><em>당신의 첫 시즌.</em></h1><p>열여섯, 학교 야구부의 벤치에서 시작합니다.<br />고교 무대를 지나 KBO의 전설이 될 때까지.</p><div className="landingSteps"><span>고교 야구부</span><span>드래프트</span><span>KBO</span><span>명예의 전당</span></div></section>}
    {error && <p role="alert" className="error">{error}</p>}
    {!ready || (save && pathname.replace(/\/$/, '') !== '/career') ? <section className="panel" role="status">커리어를 불러오는 중…</section> : save ? <section className="panel">
      <div hidden={tab !== 'player'}><div className="panelHead"><div><p className="eyebrow">{save.year} · {isYouth(save) ? `고교 ${save.youth!.grade}학년` : phaseLabels[save.phase]}</p><h2>{save.player.name} <small>{save.player.age}세 / {positionName(save.player)} · {statusLabels[save.player.rosterStatus ?? 'BENCH']}</small></h2><p>{teamName(save.player.teamId)}{isYouth(save) ? ' · 16세부터 시작한 나의 야구' : ` · 연봉 ${save.player.salaryCR.toLocaleString()} CR`}</p></div><div className="ovr"><span>OVR</span><strong>{overall(save.player)}</strong></div></div>
      <div className="skills">{Object.entries(save.player.skills).map(([key, value]) => <div key={key}><span>{labels[key]}</span><strong>{value}</strong><meter min="1" max="99" value={value} aria-label={labels[key]} /></div>)}</div>
      <PositionSettings save={save} busy={busy} onChange={persist} /></div>
      {tab === 'home' && <CareerHome save={save} onSeason={() => setTab('season')} />}
      {tab === 'season' && save.phase === 'PRESEASON' && <><label>이번 시즌 집중 육성<select value={focusSkill(save)} disabled={busy} onChange={e => persist(selectFocus(save, e.target.value))}>{Object.keys(save.player.skills).map(key => <option key={key} value={key}>{labels[key]}</option>)}</select></label><p>선택한 능력치는 시즌 종료 시 성장에 추가 반영됩니다. 시즌 시작 전까지 바꿀 수 있습니다.</p><h3>시즌 전 훈련</h3><p>{save.trained ? '훈련 완료. 선택한 능력치가 2 올랐습니다.' : '즉시 올릴 능력치를 선택하세요. 시즌 전 훈련은 한 번 가능합니다.'}</p>
      <div className="actions">{Object.keys(save.player.skills).map(key => <button disabled={busy || save.trained} key={key} onClick={() => persist(train(save, key))}>{labels[key]} +2</button>)}</div></>}
      <div hidden={tab !== 'season' && tab !== 'records'}><SeasonPanel view={tab === 'records' ? 'records' : 'season'} save={save} busy={busy} onChange={setSave} onBusy={setBusy} onError={setError} /></div>
      <div hidden={tab !== 'records'}><details><summary>개막 라운드 대진표</summary>{save.schedule.filter(g => g.round === 1 && (!isYouth(save) || g.homeTeamId === save.player.teamId || g.awayTeamId === save.player.teamId)).map(g => <p key={g.id}>{teamName(g.awayTeamId)} <span className="muted">원정 vs 홈</span> {teamName(g.homeTeamId)}</p>)}</details>
      <button className="danger" disabled={busy} onClick={async () => { if (!window.confirm('저장된 커리어를 삭제하고 새로 시작할까요?')) return; setBusy(true); try { await deleteCareer(); setSave(null); } catch { setError('저장 데이터 삭제에 실패했습니다.'); } finally { setBusy(false); } }}>커리어 삭제</button></div>
    </section> : <form className="panel" onSubmit={async e => { e.preventDefault(); const data = new FormData(e.currentTarget); try { await persist(createCareer({ name: String(data.get('name')), role, teamId: String(data.get('team')), schoolId, style, position: role === 'HITTER' ? position : undefined, focus: String(data.get('focus')), hand: data.get('hand') === 'LEFT' ? 'LEFT' : 'RIGHT' }, crypto.getRandomValues(new Uint32Array(1))[0])); } catch (e) { setError(e instanceof Error ? e.message : '선수 생성에 실패했습니다.'); } }}>
      <p className="eyebrow">NEW PLAYER</p><h2>어떤 선수로 기억될까요?</h2><label>선수 이름<input name="name" placeholder="이름을 입력하세요" maxLength={12} required /></label>
      <fieldset><legend>선수 역할</legend><div className="roles">{(['HITTER', 'PITCHER'] as Role[]).map(r => <label key={r} className={role === r ? 'selected role' : 'role'}><input type="radio" name="role" checked={role === r} onChange={() => { setRole(r); setStyle(0); }} /><strong>{r === 'HITTER' ? '타자' : '투수'}</strong><span>{r === 'HITTER' ? '한 번의 스윙으로 경기를 바꾸다' : '마운드 위에서 승부를 지배하다'}</span></label>)}</div></fieldset>
      {role === 'HITTER' && <label>수비 포지션<select value={position} onChange={e => setPosition(e.target.value as FieldPosition)}>{FIELD_POSITIONS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>}
      <SchoolPicker value={schoolId} onChange={setSchoolId} />
      <fieldset><legend>플레이 스타일 · 모두 OVR 45에서 시작</legend><div className="styleOptions">{PLAYER_STYLES[role].map((s, i) => <button type="button" key={s.name} aria-pressed={style === i} onClick={() => setStyle(i)}><strong>{s.name}</strong><span>{s.description}</span></button>)}</div><div className="previewSkills">{Object.entries(PLAYER_STYLES[role][style].skills).map(([key, value]) => <span key={key}>{labels[key]} <strong>{value}</strong></span>)}</div></fieldset>
      <label>집중 육성<select key={role} name="focus">{Object.keys(PLAYER_STYLES[role][style].skills).map(k => <option key={k} value={k}>{labels[k]}</option>)}</select></label>
      <div className="fields"><label>응원하는 KBO 구단<select name="team">{TEAMS.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>{role === 'HITTER' && <label>타격 방향<select name="hand"><option value="RIGHT">우타</option><option value="LEFT">좌타</option></select></label>}</div>
      <button className="primary" disabled={busy}>{busy ? '저장 중…' : '나의 커리어 시작하기 →'}</button><p className="footnote">16세 고교 1학년 · 입단 구단은 드래프트에서 결정 · 자동 저장</p>
    <details><summary>등록 팀 출처</summary><p className="footnote"><a href={SCHOOL_SOURCE} target="_blank" rel="noreferrer">대한야구소프트볼협회 2026년 18세 이하부 팀정보</a> · 104팀. 구단·학교 명칭을 활용한 독립 게임이며 선수와 경기 결과는 게임 속 설정입니다.</p></details>
    </form>}
    {save && <nav className="bottomTabs" aria-label="커리어 메뉴">{([['home', '홈'], ['season', '시즌'], ['player', '선수'], ['records', '기록']] as const).map(([key, label]) => <button key={key} aria-current={tab === key ? 'page' : undefined} disabled={busy} onClick={() => setTab(key)}><span aria-hidden="true">{key === 'home' ? '⌂' : key === 'season' ? '▣' : key === 'player' ? '♙' : '▤'}</span>{label}</button>)}</nav>}
    <footer>DIAMOND ROAD <span>나만의 야구 커리어 · 자동 저장</span></footer>
  </main>;
}
