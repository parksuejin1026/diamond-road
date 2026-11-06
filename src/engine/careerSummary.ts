import type {CareerSave} from './career';
import type {HitterStats,PitcherStats} from '../domain/types';
import {emptyHitter,emptyPitcher} from './season';
import {overall,hitterRates,pitcherRates} from '../domain/calculators';
import {isYouth, type SchoolYear} from './youth';
export function careerSummary(save:CareerSave){
  const studentYears: (SchoolYear & {partial?: boolean})[] = [...(save.youth?.history ?? [])];
  if (save.phase === 'RETIRED' && isYouth(save) && save.league.round > 0 && !studentYears.some(row => row.year === save.year)) {
    const youth = save.youth!;
    studentYears.push({year: save.year, age: save.player.age, grade: youth.grade,
      schoolId: youth.schoolId, level: youth.level ?? 'HIGH_SCHOOL', partial: true,
      hitter: save.league.hitters[save.player.id] ?? null, pitcher: save.league.pitchers[save.player.id] ?? null,
      beforeOvr: overall({...save.player, skills: youth.yearStartSkills}), afterOvr: overall(save.player),
      beforeSkills: youth.yearStartSkills, afterSkills: save.player.skills, awards: [], cups: []});
  }
  const hitter=emptyHitter(),pitcher=emptyPitcher(),studentHitter=emptyHitter(),studentPitcher=emptyPitcher();
  const add=(h:HitterStats,p:PitcherStats,row:{hitter:HitterStats|null;pitcher:PitcherStats|null})=>{
    if(row.hitter)for(const k of Object.keys(h) as (keyof HitterStats)[])h[k]=(h[k]??0)+(row.hitter[k]??0);
    if(row.pitcher)for(const k of Object.keys(p) as (keyof PitcherStats)[])p[k]+=row.pitcher[k];
  };
  for(const season of save.seasons)add(hitter,pitcher,season);
  for(const year of studentYears)add(studentHitter,studentPitcher,year);
  const played=save.seasons.filter(s=>(s.hitter?.pa??s.pitcher?.outs??0)>0);
  const score=(s:typeof save.seasons[number])=>s.hitter?s.hitter.h+s.hitter.hr*8+s.hitter.rbi*.5:(s.pitcher?.outs??0)+(s.pitcher?.so??0)*2-(s.pitcher?.er??0)*3;
  const best=[...played].sort((a,b)=>score(b)-score(a)||a.year-b.year)[0];
  const awards=save.seasons.flatMap(s=>(s.awards??[]).map(title=>({year:s.year,title})));
  const clubs=[...new Set(save.seasons.map(s=>s.teamId))].map(id=>{
    const seasons=save.seasons.filter(s=>s.teamId===id);return{id,seasons:seasons.length,first:Math.min(...seasons.map(s=>s.year)),last:Math.max(...seasons.map(s=>s.year))};
  }).sort((a,b)=>b.seasons-a.seasons||a.first-b.first);
  return{hitter,pitcher,studentHitter,studentPitcher,studentYears,hitterRates:hitterRates(hitter),pitcherRates:pitcherRates(pitcher),best,awards,clubs,
    championships:save.seasons.filter(s=>s.championship).length,mvp:awards.filter(a=>a.title==='시즌 MVP').length,
    peak:Math.max(overall(save.player),...save.seasons.map(s=>s.ovr),...(save.youth?.history.map(s=>s.afterOvr)??[])),
    income:save.life?.ledger.filter(l=>l.amount>0).reduce((n,l)=>n+l.amount,0)??0,
    medals:save.asianGames?.filter(r=>r.selected&&r.medal)??[],
    firstYear:save.youth?.history[0]?.year??save.seasons[0]?.year??save.year,
  };
}
