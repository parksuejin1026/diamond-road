import type { HitterStats, PitcherStats } from '../domain/types';
import { hitterRates, pitcherRates } from '../domain/calculators';
const labels: Record<string, string> = { g: '경기', pa: '타석', ab: '타수', h: '안타', doubles: '2루타', triples: '3루타', hr: '홈런', bb: '볼넷', so: '삼진 / 탈삼진', rbi: '타점', runs: '득점', gidp: '병살타', gs: '선발', outs: '아웃카운트', hits: '피안타', er: '자책점', wins: '승', losses: '패' };
export default function StatsDetails({ hitter, pitcher, title = '전체 시즌 기록' }: { hitter?: HitterStats | null; pitcher?: PitcherStats | null; title?: string }) {
  const stats = hitter ?? pitcher; if (!stats) return null;
  const ratios = hitter ? hitterRates(hitter) : pitcherRates(pitcher!);
  return <details><summary>{title}</summary><dl className="statGrid">{Object.entries(stats).map(([key, value]) => <div key={key}><dt>{labels[key]}</dt><dd>{value}</dd></div>)}{hitter && <div><dt>단타</dt><dd>{hitter.h - hitter.doubles - hitter.triples - hitter.hr}</dd></div>}{Object.entries(ratios).map(([key, value]) => <div key={key}><dt>{key.toUpperCase()}</dt><dd>{value === null ? '—' : value.toFixed(hitter ? 3 : 2)}</dd></div>)}</dl></details>;
}
