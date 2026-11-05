import type { CareerSave } from '../engine/career';
import { mvpCount, MVP_TARGET } from '../engine/achievements';
export default function CareerGoal({ save }: { save: CareerSave }) {
  const count = mvpCount(save);
  return <section className="careerGoal" aria-label="시즌 MVP 목표"><span>커리어 목표 · 시즌 MVP</span><strong>{count} / {MVP_TARGET}</strong><progress max={MVP_TARGET} value={Math.min(count, MVP_TARGET)} aria-label="시즌 MVP 달성도" /><small>{save.mvpReward ? `★ ${save.mvpReward.title} · 달성 ${save.mvpReward.year}` : '12회 수상 시 전설 칭호와 황금 기념품'}</small></section>;
}
