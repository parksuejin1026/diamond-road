import type { CareerSave } from '../engine/career';
import { isYouth } from '../engine/youth';
const labels: Record<string, string> = { contact: '컨택', power: '파워', eye: '선구안', speed: '주력', defense: '수비', mental: '정신력', velocity: '구속', control: '제구', breaking: '변화구', stamina: '체력' };
export default function DevelopmentReport({ save }: { save: CareerSave }) {
  const youth = isYouth(save) ? save.youth!.history.at(-1) : null;
  const report = youth ? { ...youth, focus: save.youth!.focus } : save.development;
  if (!report || report.year !== save.year || !['SEASON_RESULT', 'RETIRED'].includes(save.phase)) return null;
  return <section className="growthCard" aria-label="시즌 성장 결산"><p className="eyebrow">SEASON GROWTH · {report.year}</p><h2>한 시즌이 남긴 변화</h2><p>특성 자동 성장 · {save.life?.growth?.skills.map(k=>labels[k]).join(' · ') ?? labels[report.focus]}</p><div className="growthOvr">OVR {report.beforeOvr} <span>→</span> {report.afterOvr}</div><div className="growthGrid">{Object.entries(report.afterSkills).map(([key, value]) => { const difference = value - report.beforeSkills[key]; return <div key={key}><span>{labels[key]}{key === report.focus ? ' ★' : ''}</span><strong>{report.beforeSkills[key]} → {value}</strong><em className={difference < 0 ? 'decline' : ''}>{difference > 0 ? '+' : ''}{difference}</em></div>; })}</div><p className="footnote">나이·잠재력과 집중 육성에 따라 변화합니다. 결산에 표시된 성장치는 이미 반영됐습니다.</p></section>;
}
