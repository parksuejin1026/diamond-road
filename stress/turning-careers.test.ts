import {expect,it} from 'vitest';
import {createCareer} from '../src/engine/career';
import {advanceRound,nextSeason} from '../src/engine/season';
import {SCHOOLS} from '../src/engine/schools';
import {signDraft} from '../src/engine/youth';
import {pendingDecision} from '../src/engine/decisions';
import {answerTurningPoint,acknowledgeTurningPoint} from '../src/engine/turningPoints';
import {resolveDecisions} from '../src/tests/resolve-decisions';
import {careerSummary} from '../src/engine/careerSummary';
it.each(['HITTER','PITCHER'] as const)('%s 전환점 수락·고교·프로 20시즌·은퇴 기록을 완주한다',role=>{
 let save=createCareer({name:'전환점 완주',role,hand:'RIGHT',teamId:'lg',schoolId:SCHOOLS[0].id,style:5},314),events=0,steps=0;
 while(save.phase!=='RETIRED'&&steps++<4000){
  const decision=pendingDecision(save);
  if(decision==='TURNING_POINT'){save=answerTurningPoint(save,true);events++;}
  else if(decision==='TURNING_RESULT')save=acknowledgeTurningPoint(save);
  else if(decision&&decision!=='EDUCATION')save=resolveDecisions(save);
  else if(save.phase==='DRAFT')save=signDraft(save);
  else if(save.phase==='SEASON_RESULT')save=nextSeason(save);
  else save=advanceRound(save,{interactive:false,events:true});
 }
 expect(save.phase).toBe('RETIRED');expect(save.player.age).toBe(38);expect(save.seasons).toHaveLength(20);expect(save.youth!.history).toHaveLength(3);expect(events).toBeGreaterThan(0);expect(events).toBeLessThan(23);
 for(const value of Object.values(save.player.skills)){expect(value).toBeGreaterThanOrEqual(1);expect(value).toBeLessThanOrEqual(99);}
 expect(careerSummary(save).clubs.reduce((n,c)=>n+c.seasons,0)).toBe(20);expect(new Set(save.seasons.map(s=>s.year)).size).toBe(20);
 console.log('TURNING_CAREER',JSON.stringify({role,events,styles:save.life!.styleHistory?.length??0,seasons:save.seasons.length,steps}));
},300000);
