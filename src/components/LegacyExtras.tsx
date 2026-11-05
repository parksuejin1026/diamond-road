import type { CareerSave } from '../engine/career';
import { legacyComparison, retiredNumber } from '../engine/legacy';
import { teamName } from '../engine/youth';
import { won, life } from '../engine/life';
import TeamMark from './TeamMark';
export default function LegacyExtras({save}:{save:CareerSave}){
 const comparisons=legacyComparison(save),numbers=retiredNumber(save);
 return <section className="notice"><h3>당신과 닮은 KBO 은퇴 선수</h3>{comparisons.length?comparisons.map(c=><p key={c.name}><strong>{c.name} · {c.similarity}%</strong></p>):<p>비교에 필요한 프로 출전 기록이 부족합니다.</p>}<p className="footnote">KBO 은퇴 선수 12명의 통산 기록 중 같은 역할과 비교합니다. 생산성·장타/삼진·볼넷/실점·누적 출전을 이용한 자체 유사도이며 시대 보정과 해외 기록은 제외합니다.</p><a href={`https://www.koreabaseball.com/Record/Player/${save.player.role==='HITTER'?'HitterBasic':'PitcherBasic'}/BasicTotal.aspx`} target="_blank" rel="noreferrer">비교 기록 출처 · KBO</a><h3>영구결번</h3>{numbers.length?numbers.map(id=><p key={id}><TeamMark id={id}/>{teamName(id)} · No.{life(save).number} 영구결번</p>):<p>영구결번 선정 없음 · 한 구단에서의 장기 활약과 수상·우승·팬 관계를 종합합니다.</p>}<p>은퇴 시 보유 현금 · {won(life(save).cash)}</p>{save.serviceRecords?.map(r=><p key={r.year}>{r.year} {r.kind} · {r.games}경기 {r.hitter?`${r.hitter.h}안타 · ${r.hitter.hr}홈런`:r.pitcher?`${r.pitcher.so}탈삼진`:''}</p>)}</section>;
}
