import type { CareerSave } from '../engine/career';
import { countryName, type AsianGamesReport } from '../engine/asianGames';
import { teamName } from '../engine/youth';
import StatsDetails from './StatsDetails';
const medalNames = { GOLD: '금메달', SILVER: '은메달', BRONZE: '동메달' };
function Medal({ medal }: { medal: NonNullable<AsianGamesReport['medal']> }) {
  const color = { GOLD: '#f4b950', SILVER: '#b6c9df', BRONZE: '#cc9468' }[medal];
  return <svg width="48" height="48" viewBox="0 0 24 24" shapeRendering="crispEdges" role="img" aria-label={medalNames[medal]}><path d="M4 1H9L14 11H9ZM15 1H20L15 11H10Z" fill="#cf586d" /><path d="M8 9H16V11H18V19H16V21H8V19H6V11H8Z" fill={color} /><path d="M10 12H14V14H16V16H14V18H10V16H8V14H10Z" fill="#fff0ce" /></svg>;
}
export default function AsianGamesPanel({ save, history = false }: { save: CareerSave; history?: boolean }) {
  const reports = save.asianGames ?? [];
  if (history) return <details><summary>국가대표 · 아시안게임 기록 ({reports.filter(report => report.selected).length}회 선발)</summary><p>2026년부터 4년마다 열리는 게임 속 대회입니다. 프로 선수의 능력과 시즌 성적으로 선발합니다.</p>{!reports.length && <p>아직 대회 기록이 없습니다.</p>}{reports.map(report => <p key={report.year}>{report.year} · {report.selected ? `${report.medal ? medalNames[report.medal] : `${report.rank}위`} · ${report.hitter ? `${report.hitter.g}경기 ${report.hitter.h}안타 ${report.hitter.hr}홈런` : `${report.pitcher?.g ?? 0}경기 ${report.pitcher?.so ?? 0}탈삼진`}` : `미선발 · 대한민국 ${report.rank}위`}</p>)}</details>;
  const report = reports.find(report => report.year === save.year); if (!report) return null;
  return <section className="notice" aria-label="아시안게임 결과"><p className="eyebrow">TEAM KOREA · {report.year}</p><h3>{report.year} 아시안게임</h3>{report.selected && report.medal && <Medal medal={report.medal} />}<p><strong>{report.selected ? report.medal ? medalNames[report.medal] : `대한민국 ${report.rank}위` : '대표팀 미선발'}</strong><br />{report.reason}{!report.selected ? ` · 대한민국 ${report.rank}위` : ` · 명성 +${report.reputationGain}`}</p>{report.selected && <StatsDetails title="나의 대표팀 성적 · KBO 기록과 별도" hitter={report.hitter} pitcher={report.pitcher} />}<details><summary>대한민국 경기 결과</summary>{report.games.filter(game => game.homeTeamId === 'kor' || game.awayTeamId === 'kor').map(game => <p key={game.id}>{game.stage} · {countryName(game.awayTeamId)} {game.away} : {game.home} {countryName(game.homeTeamId)} · {game.innings}회</p>)}</details><details><summary>대표팀 최종 명단 · {report.roster.length}명</summary>{report.roster.map(player => <p key={player.id}>{player.name} · {player.age}세 · {player.role === 'HITTER' ? '타자' : '투수'} · OVR {player.ovr} · {player.clubTeamId === 'amateur' ? '아마추어' : teamName(player.clubTeamId)}{player.wildcard ? ' · 와일드카드' : ''}</p>)}</details><p className="footnote">국가명·대회 구조를 참고한 가상 경기입니다. 선발·동률 순위·연장 규칙은 게임용으로 간소화했습니다.</p></section>;
}
