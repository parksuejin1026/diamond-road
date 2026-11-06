import 'fake-indexeddb/auto';
import {expect,it} from 'vitest';
import {createCareer,type CareerSave} from '../engine/career';
import {advanceRound,nextSeason} from '../engine/season';
import {SCHOOLS,UNIVERSITIES,createUniversitySchedule} from '../engine/schools';
import {enrollUniversity,signDraft,nextSchoolYear,teamName} from '../engine/youth';
import {pendingDecision,resolveTournament,acknowledge} from '../engine/decisions';
import {focusSkill,rerollFocus,developPlayer} from '../engine/development';
import {personalMoment,recordMoment,type Moment} from '../engine/moments';
import {applyMilitary} from '../engine/international';
import {Rng} from '../engine/rng';
import {createGame} from '../engine/game';
import {saveCareer,loadCareer,deleteCareer} from '../persistence/career';
const make=()=>createCareer({name:'직접 선택',role:'HITTER',hand:'RIGHT',teamId:'lg',focus:'defense'},41);
export function graduatedSchool(role:'HITTER'|'PITCHER'='HITTER'):CareerSave {
 const save=createCareer({name:'대학 도전',role,hand:'RIGHT',teamId:'lg',schoolId:SCHOOLS[0].id,focus:role==='HITTER'?'power':'control'},41);
 save.year=2028;save.player.age=18;save.youth!.grade=3;save.phase='SEASON_RESULT';
 save.youth!.draft={teamId:'lg',round:3,overallPick:25,score:72,signingBonusCR:27000,salaryCR:5000};return save;
}
const moment=(id:string,actorId='user',kind:Moment['kind']='HOME_RUN'):Moment=>({id,actorId,year:2026,kind,name:actorId==='user'?'직접 선택':'다른 선수',inning:9,outs:2,bases:0,before:'1 : 1',after:'1 : 2',walkoff:false,grandSlam:false,stage:'한국시리즈'});
it('선택한 집중 능력치를 성장시키고 랜덤 변경은 연도당 한 번만 저장한다',()=>{
 const save=make();expect(save.life?.growth?.skills).toContain('defense');
 const next=rerollFocus(save);expect(focusSkill(next)).not.toBe('defense');expect(next.life?.growth?.skills).toContain(focusSkill(next));
 expect(rerollFocus(next)).toBe(next);expect(rerollFocus(structuredClone(save))).toEqual(next);
 save.player.potential=99;const before=save.player.skills.defense;developPlayer(save,new Rng(42));expect(save.player.skills.defense).toBeGreaterThan(before);
 expect(rerollFocus({...next,year:2027})).not.toEqual(next);expect(rerollFocus({...save,phase:'SIMULATING'}).phase).toBe('SIMULATING');
});
it('모든 구단 계약은 잔류 제안도 포함해 직접 선택하기 전 다음 시즌을 막는다',()=>{
 for(const kind of ['DRAFT','RENEWAL','EXTENSION','FA','RELEASE','TRADE'] as const){
  const save=make();save.phase='SEASON_RESULT';save.contractOffers=[{teamId:'lg',year:2027,salaryCR:5000,years:1,opportunity:'BENCH',kind}];
  expect(pendingDecision(save)).toBe('CONTRACT');expect(()=>nextSeason(save)).toThrow('계약');expect(save.player.salaryCR).toBe(3000);
 }
});
it('본인 장면 하나만 고르고 실제 타석의 다른 선수 장면은 저장하지 않는다',()=>{
 const save=make();save.moments=[moment('other','npc'),moment('mine'),{...moment('best'),walkoff:true}];
 expect(personalMoment(save)?.id).toBe('best');save.phase='SEASON_RESULT';expect(pendingDecision(save)).toBe('MOMENT');
 expect(pendingDecision(acknowledge(save,'MOMENT'))).toBeNull();
 const before=createGame();save.pendingGame={fixture:{id:'post-1',homeTeamId:'lg',awayTeamId:'kia',stage:'한국시리즈'},pa:1} as never;
 const count=save.moments.length;recordMoment(save,before,before,'HOME_RUN','lg-1','kia-10');expect(save.moments).toHaveLength(count);
});
it('세계대회는 선택 전 실행되지 않고 보류하면 선발·개인 기록·상금을 주지 않는다',()=>{
 const save=make();save.year=2027;save.phase='SEASON_RESULT';save.postseason={champion:'kia',games:[]};save.player.rosterStatus='STARTER';
 for(const key of Object.keys(save.player.skills))save.player.skills[key]=99;
 expect(pendingDecision(save)).toBe('WORLD');expect(save.world).toBeUndefined();expect(()=>nextSeason(save)).toThrow('이벤트');
 const next=resolveTournament(save,'WORLD',false);expect(next.world?.[0].selected).toBe(false);expect(next.world?.[0].hitter).toBeNull();expect(next.life?.cash).toBe(save.life?.cash);
 expect(pendingDecision(next)).toBe('WORLD_RESULT');expect(resolveTournament(next,'WORLD',true)).toBe(next);
 expect(pendingDecision(acknowledge(next,'WORLD_RESULT'))).toBeNull();expect(next.league).toEqual(save.league);
});
it('아시안게임 참가와 결과 확인도 별도 선택으로 한 번만 처리한다',()=>{
 const save=make();save.phase='SEASON_RESULT';save.postseason={champion:'kia',games:[]};save.player.age=22;save.player.rosterStatus='STARTER';
 for(const key of Object.keys(save.player.skills))save.player.skills[key]=99;
 expect(pendingDecision(save)).toBe('ASIAN');const next=resolveTournament(save,'ASIAN',true);
 expect(next.asianGames?.[0].selected).toBe(true);expect(pendingDecision(next)).toBe('ASIAN_RESULT');
 expect(resolveTournament(next,'ASIAN',true)).toBe(next);expect(pendingDecision(acknowledge(next,'ASIAN_RESULT'))).toBeNull();
});
it('진학은 졸업 때만 가능하고 대학 대진에는 중복 출전·자기 대결이 없다',()=>{
 expect(enrollUniversity(make(),UNIVERSITIES[0].id).youth).toBeFalsy();const save=graduatedSchool();expect(pendingDecision(save)).toBe('EDUCATION');
 const next=enrollUniversity(save,UNIVERSITIES[0].id);expect(next.year).toBe(2029);expect(next.player.age).toBe(19);expect(next.youth?.draft).toBeNull();expect(next.youth?.highSchoolId).toBe(SCHOOLS[0].id);
 expect(teamName(next.player.teamId)).toBe(UNIVERSITIES[0].name);const schedule=createUniversitySchedule(1);
 for(let r=1;r<=14;r++){const games=schedule.filter(g=>g.round===r),ids=games.flatMap(g=>[g.homeTeamId,g.awayTeamId]);expect(new Set(ids).size).toBe(ids.length);expect(games.every(g=>g.homeTeamId!==g.awayTeamId)).toBe(true);}
 expect(enrollUniversity(next,UNIVERSITIES[1].id)).toBe(next);
});
it.each(['HITTER','PITCHER'] as const)('%s 대학 4년의 리그·전국대회·저장 복구·드래프트·23세 프로 입단을 완주한다',async role=>{
 await deleteCareer();let save=enrollUniversity(graduatedSchool(role),UNIVERSITIES[0].id);
 for(let grade=1;grade<=4;grade++){
  for(let n=0;n<20&&save.phase!=='SEASON_RESULT';n++)save=advanceRound(save,{interactive:false});
  expect(save.phase).toBe('SEASON_RESULT');expect(save.youth?.grade).toBe(grade);expect(save.youth?.cups).toHaveLength(2);
  expect(save.youth?.history.filter(y=>y.level==='UNIVERSITY')).toHaveLength(grade);expect(save.seasons).toHaveLength(0);
  expect(save.contractService).toBeUndefined();expect(save.player.salaryCR).toBe(0);
  await saveCareer(save);expect(await loadCareer()).toEqual(save);
  save=nextSchoolYear(save);
 }
 expect(save.phase).toBe('DRAFT');expect(save.youth?.draft).toBeTruthy();save=signDraft(save);
 expect(save.player.age).toBe(23);expect(save.year).toBe(2033);expect(save.youth?.graduated).toBe(true);expect(save.players).toHaveLength(180);expect(save.schedule).toHaveLength(720);
 await saveCareer(save);expect(await loadCareer()).toEqual(save);
},60000);
it('미확인 이벤트와 랜덤 집중 변경은 재접속 후에도 유지된다',async()=>{
 await deleteCareer();let save=make();save=rerollFocus(save);save.phase='SEASON_RESULT';save.moments=[moment('saved')];
 await saveCareer(save);const loaded=(await loadCareer())!;expect(pendingDecision(loaded)).toBe('MOMENT');expect(loaded.focusSkill).toBe(save.focusSkill);
 await saveCareer(acknowledge(loaded,'MOMENT'));expect(pendingDecision((await loadCareer())!)).toBeNull();
});

it('병역 결정도 별도 화면을 요구하고 결과 확인 전 다음 시즌을 막는다',()=>{
 const save=make();save.phase='SEASON_RESULT';save.player.age=22;save.requestedDecision='MILITARY';expect(pendingDecision(save)).toBe('MILITARY');
 const next={...applyMilitary(save,false),requestedDecision:undefined};expect(pendingDecision(next)).toBe('MILITARY_RESULT');expect(()=>nextSeason(next)).toThrow('이벤트');
 expect(pendingDecision(acknowledge(next,'MILITARY_RESULT'))).toBeNull();
});
