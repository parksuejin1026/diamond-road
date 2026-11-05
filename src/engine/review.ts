import type { CareerSave } from './career';
import { hitterRates, pitcherRates } from '../domain/calculators';
export function seasonReview(save:CareerSave){
  const h=save.league.hitters[save.player.id],p=save.league.pitchers[save.player.id];
  const prior=save.seasons.filter(s=>s.year<save.year).at(-1);
  if(h){
    if(!h.pa)return '출전 기회를 얻지 못한 시즌입니다. 다음 시즌을 위한 준비가 필요합니다.';
    const rates=hitterRates(h), change=prior?.hitter?h.hr-prior.hitter.hr:null;
    return `${h.g}경기에서 타율 ${rates.avg.toFixed(3)}, ${h.hr}홈런, ${h.rbi}타점을 기록했습니다. ${rates.ops>=.85?'중심 타선에서 빛난 시즌이었습니다.':rates.ops>=.7?'타석에서 자신의 몫을 해냈습니다.':'타격에서 아쉬움을 남겼습니다.'}${change!==null?` 전년보다 홈런이 ${Math.abs(change)}개 ${change>=0?'늘었습니다':'줄었습니다'}.`:''}`;
  }
  if(!p?.outs)return '마운드에서 기회를 기다린 시즌입니다.';
  return `${p.g}경기, ${Math.floor(p.outs/3)}.${p.outs%3}이닝에서 ${p.wins}승과 ${p.so}탈삼진을 기록했습니다. 평균자책점 ${pitcherRates(p).era?.toFixed(2)}로 ${p.er*27/p.outs<3.5?'마운드를 든든하게 지켰습니다.':'다음 시즌의 도약을 준비합니다.'}`;
}
