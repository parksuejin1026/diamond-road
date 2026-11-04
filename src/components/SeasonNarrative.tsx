import type { CareerSave } from '../engine/career';
import { isYouth, teamName } from '../engine/youth';
export default function SeasonNarrative({ save }: { save: CareerSave }) {
  if (save.phase !== 'SEASON_RESULT') return null;
  const h = save.league.hitters[save.player.id]; const p = save.league.pitchers[save.player.id];
  const youth = isYouth(save);
  const headline = youth ? `${teamName(save.player.teamId)}의 ${save.youth!.grade}학년, 다음 무대를 준비하다` : h && h.hr >= 20 ? `${save.player.name}, 장타로 자신의 자리를 증명하다` : p && p.wins >= 10 ? `${save.player.name}, 마운드에서 쌓아 올린 두 자릿수 승리` : `${save.player.name}의 ${save.year}년, 기록으로 남은 한 시즌`;
  const story = h ? `${h.g}경기에서 ${h.h}개의 안타와 ${h.hr}개의 홈런. ${h.pa > 300 ? '꾸준한 출전 속에서 팀의 한 자리를 지켰습니다.' : '주어진 기회마다 방망이로 답하려고 했습니다.'}` : `${p?.g ?? 0}경기 등판, ${p?.so ?? 0}탈삼진. ${(p?.gs ?? 0) > 5 ? '선발 로테이션을 돌며 긴 시즌을 견뎠습니다.' : '하나의 아웃카운트가 다음 기회로 이어집니다.'}`;
  return <article className="seasonNews"><p className="eyebrow">DUGOUT REPORT · 게임 속 시즌 리포트</p><h3>{headline}</h3><p>{story}</p>{youth && <p className="coachNote">코치 노트 · {save.youth!.trust >= 55 ? '이제 팀에서 더 큰 역할을 맡길 수 있겠어. 다음 학년의 활약이 기대된다.' : '아직 배울 것이 많지만, 오늘의 훈련이 내일의 출전 기회를 만든다.'}</p>}</article>;
}
