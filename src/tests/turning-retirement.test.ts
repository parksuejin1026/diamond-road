import 'fake-indexeddb/auto';
import {expect,it} from 'vitest';
import {createCareer,type CareerSave} from '../engine/career';
import {PLAYER_STYLES,styleRedistribution} from '../engine/playStyles';
import {triggerTurningPoint,answerTurningPoint,acknowledgeTurningPoint,planTurningPoint} from '../engine/turningPoints';
import {advanceRound,retire,emptyHitter} from '../engine/season';
import {pendingDecision} from '../engine/decisions';
import {developPlayer} from '../engine/development';
import {careerSummary} from '../engine/careerSummary';
import {SCHOOLS} from '../engine/schools';
import {saveCareer,loadCareer,deleteCareer} from '../persistence/career';
import {Rng} from '../engine/rng';
const make=(role:'HITTER'|'PITCHER'='PITCHER',seed=1)=>createCareer({name:'전환점',role,teamId:'lg',hand:'RIGHT',schoolId:SCHOOLS[0].id,style:0},seed);
it('전환점은 모든 시즌에 뜨지 않고, 시즌 중 무작위 라운드에 결정되며 다시 추첨되지 않는다',()=>{
 let none=0,events=0;const rounds=new Set<number>();
 for(let seed=1;seed<=70;seed++){
  const save=make('PITCHER',seed),event=structuredClone(save.life!.turningPoint!);
  if(event.status==='NONE')none++;else{events++;expect(event.round).toBeGreaterThanOrEqual(4);expect(event.round).toBeLessThanOrEqual(11);rounds.add(event.round);}
  save.rngState+=500;planTurningPoint(save);expect(save.life!.turningPoint).toEqual(event);
 }
 expect(none).toBeGreaterThan(0);expect(events).toBeGreaterThan(0);expect(rounds.size).toBeGreaterThan(3);
});
it.each(['HITTER','PITCHER'] as const)('%s의 스타일 전환은 기존 능력을 재배분하고 새 성장 방향을 한 번만 적용한다',role=>{
 const save=make(role);save.phase='SIMULATING';save.league.round=5;save.player.potential=99;
 for(const key of Object.keys(save.player.skills))save.player.skills[key]=75;
 save.life!.turningPoint={year:save.year,round:5,status:'PENDING',kind:'STYLE',style:5};
 const before=structuredClone(save),next=answerTurningPoint(save,true);
 expect(next.life!.style).toBe(5);expect(next.player.skills).not.toEqual(before.player.skills);
 expect(Object.values(next.player.skills).reduce((a,b)=>a+b,0)).toBe(Object.values(before.player.skills).reduce((a,b)=>a+b,0));
 expect(Object.values(next.player.skills).every(v=>v>=73)).toBe(true);expect(answerTurningPoint(next,true)).toBe(next);
 expect(next.life!.styleHistory).toHaveLength(1);expect(pendingDecision(next)).toBe('TURNING_RESULT');expect(advanceRound(next,{interactive:false,events:true})).toBe(next);
 const ready=acknowledgeTurningPoint(next);developPlayer(ready,new Rng(4));expect(ready.life!.growth!.skills).toEqual([...PLAYER_STYLES[role][5].growth]);
 expect(save).toEqual(before);
});
it('유지 선택은 능력치와 방향을 바꾸지 않고, 집중 변경은 해당 이벤트가 있을 때만 적용한다',()=>{
 const save=make();save.phase='SIMULATING';save.league.round=6;save.life!.turningPoint={year:save.year,round:6,status:'PENDING',kind:'FOCUS',focus:'stamina'};
 const declined=answerTurningPoint(save,false);expect(declined.player.skills).toEqual(save.player.skills);expect(declined.focusSkill).toBe(save.focusSkill);
 const accepted=answerTurningPoint(save,true);expect(accepted.focusSkill).toBe('stamina');expect(accepted.player.skills).toEqual(save.player.skills);
 expect(acknowledgeTurningPoint(accepted).life!.turningPoint!.acknowledged).toBe(true);
});
it('재배분은 능력치 상한·하한을 지키고 총합을 보존한다',()=>{
 for(const role of ['HITTER','PITCHER'] as const)for(const profile of PLAYER_STYLES[role])for(const level of [1,45,98,99]){
  const skills=Object.fromEntries(Object.keys(profile.skills).map((k,i)=>[k,i%2?level:Math.max(1,100-level)]));
  for(let style=0;style<6;style++){const result=styleRedistribution(skills,role,style);expect(Object.values(result).every(v=>v>=1&&v<=99)).toBe(true);expect(Object.values(result).reduce((a,b)=>a+b,0)).toBe(Object.values(skills).reduce((a,b)=>a+b,0));}
 }
});
it('실제 시즌 자동 진행은 전환점에서 정지하고 선택 후 다음 라운드부터 이어진다',()=>{
 let save=make('HITTER',2);save.life!.turningPoint={year:save.year,round:4,status:'SCHEDULED',kind:'STYLE',style:3};
 for(let i=0;i<4;i++)save=advanceRound(save,{interactive:false,events:true});
 expect(save.league.round).toBe(4);expect(pendingDecision(save)).toBe('TURNING_POINT');expect(advanceRound(save,{interactive:false,events:true})).toBe(save);
 const before=save.league.results.length;save=acknowledgeTurningPoint(answerTurningPoint(save,true));save=advanceRound(save,{interactive:false,events:true});
 expect(save.league.round).toBe(5);expect(save.league.results.length).toBeGreaterThan(before);expect(save.life!.turningPoint!.status).toBe('RESOLVED');
},30000);
it('새 스타일 번호와 미확인 전환점은 저장·복구 후 보존된다',async()=>{
 await deleteCareer();const save=make();save.life!.style=5;save.phase='SIMULATING';save.league.round=5;save.life!.turningPoint={year:save.year,round:5,status:'PENDING',kind:'STYLE',style:4};
 await saveCareer(save);const loaded=(await loadCareer())!;expect(pendingDecision(loaded)).toBe('TURNING_POINT');expect(loaded.life!.style).toBe(5);
 const changed=answerTurningPoint(loaded,true);await saveCareer(changed);expect((await loadCareer())!.player.skills).toEqual(changed.player.skills);
});
it('은퇴 통산은 시즌별 분모를 합산하고 학생 기록과 실제 입금액을 구분한다',()=>{
 const save=make('HITTER');save.seasons=[{year:2026,age:19,teamId:'lg',rank:2,ovr:70,hitter:{...emptyHitter(),g:40,pa:120,ab:100,h:40,bb:20,hr:4},pitcher:null,awards:['시즌 MVP']},{year:2027,age:20,teamId:'kia',rank:1,ovr:75,hitter:{...emptyHitter(),g:90,pa:330,ab:300,h:60,bb:30,hr:6},pitcher:null,championship:true}];
 save.life!.ledger=[{id:'salary-a',year:2026,amount:10000000,reason:'연봉'},{id:'salary-b',year:2027,amount:20000000,reason:'연봉'},{id:'shop',year:2027,amount:-2000000,reason:'구매'}];
 const result=careerSummary(save);expect(result.hitter.h).toBe(100);expect(result.hitterRates.avg).toBe(.25);expect(result.hitter.hr).toBe(10);expect(result.income).toBe(30000000);expect(result.mvp).toBe(1);expect(result.championships).toBe(1);expect(result.clubs).toHaveLength(2);
 expect(result.studentHitter.g).toBe(0);
});
it('시즌 중 은퇴는 확정된 현재 기록을 한 번만 보관하고 미확인 전환점을 종료한다',()=>{
 const save=createCareer({name:'마지막 경기',role:'PITCHER',teamId:'lg',hand:'RIGHT'},8);save.phase='SIMULATING';save.league.round=2;save.league.pitchers.user.outs=18;save.league.pitchers.user.so=7;
 save.life!.turningPoint={year:save.year,round:2,status:'PENDING',kind:'FOCUS',focus:'stamina'};
 const result=retire(save);expect(result.phase).toBe('RETIRED');expect(result.seasons).toHaveLength(1);expect(careerSummary(result).pitcher.so).toBe(7);expect(careerSummary(result).pitcher.outs).toBe(18);expect(pendingDecision(result)).toBeNull();expect(retire(result)).toBe(result);
});
it('이벤트 없는 시즌에 은퇴해도 저장 복구가 은퇴 전 백업으로 돌아가지 않는다',async()=>{
 await deleteCareer();const save=make();save.life!.turningPoint={year:save.year,round:0,status:'NONE'};
 await saveCareer(save);await saveCareer(retire(save));const loaded=(await loadCareer())!;
 expect(loaded.phase).toBe('RETIRED');expect(loaded.life!.turningPoint!.status).toBe('NONE');
});
