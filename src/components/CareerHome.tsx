import type { CareerSave } from '../engine/career';
import { overall, hitterRates, pitcherRates } from '../domain/calculators';
import { emptyHitter, emptyPitcher } from '../engine/season';
import { isYouth, teamName } from '../engine/youth';
import PixelPlayer from './pixel/PixelPlayer';
import PixelBallpark from './pixel/PixelBallpark';
export default function CareerHome({ save, onSeason }: { save: CareerSave; onSeason: () => void }) {
  const youth = isYouth(save);
  const history = youth ? save.youth!.history : save.seasons;
  const h = emptyHitter(); const p = emptyPitcher();
  for (const season of history) {
    if (season.hitter) for (const key of Object.keys(h) as (keyof typeof h)[]) h[key] = (h[key] ?? 0) + (season.hitter[key] ?? 0);
    if (season.pitcher) for (const key of Object.keys(p) as (keyof typeof p)[]) p[key] += season.pitcher[key];
  }
  const latest = save.youth?.history.at(-1);
  const previous = youth ? latest?.beforeOvr : save.seasons.filter(s => s.year < save.year).at(-1)?.ovr;
  const change = previous === undefined ? null : overall(save.player) - previous;
  const stats = save.player.role === 'HITTER' ? [['경기', h.g], ['타율', hitterRates(h).avg.toFixed(3)], ['홈런', h.hr], ['타점', h.rbi]] : [['경기', p.g], ['평균자책', pitcherRates(p).era?.toFixed(2) ?? '—'], ['승리', p.wins], ['탈삼진', p.so]];
  return <section className="careerHome"><div className="homeScene"><PixelBallpark school={youth} /><PixelPlayer role={save.player.role} /><span className="sceneCaption">{save.year} · {youth ? `고교 ${save.youth!.grade}학년` : 'KBO LEAGUE'}</span></div><div className="homeIdentity"><div><p className="eyebrow">MY DIAMOND ROAD</p><h1>{save.player.name}</h1><p>{teamName(save.player.teamId)} · {save.player.age}세 · {save.player.role === 'HITTER' ? '타자' : '투수'}</p></div><div className="ovr"><span>OVR</span><strong>{overall(save.player)}</strong><small>{change === null ? '첫 시즌' : `지난 시즌 대비 ${change > 0 ? '+' : ''}${change}`}</small></div></div><div className="homeStats">{stats.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div><p className="footnote">{youth ? '고교' : '프로'} 통산 · 완료 시즌 기준</p><button className="primary" onClick={onSeason}>{save.phase === 'SEASON_RESULT' ? '시즌 결산과 다음 진로 →' : save.phase === 'DRAFT' ? '신인 드래프트 확인 →' : save.phase === 'RETIRED' ? '나의 커리어 돌아보기 →' : '시즌 준비하기 →'}</button></section>;
}
