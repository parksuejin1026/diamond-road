import { expect, it, vi } from 'vitest';
import { createCareer } from '../engine/career';
import { advanceRound, nextSeason } from '../engine/season';
import { openTrainingPack, useTrainingItem } from '../engine/items';
import { awardCareerGoal, mvpCount } from '../engine/achievements';
import { createOffers, proposeTrade, resolveTrade, settleContractYear, signContract } from '../engine/contracts';
import { calculateAwards } from '../engine/awards';
import { Rng } from '../engine/rng';
const create = () => createCareer({ name:'완주', role:'HITTER', teamId:'lg', hand:'RIGHT' }, 11);
it('시즌 상자는 연도당 한 번이며 아이템 소모와 능력치 상승은 한 번만 반영한다',()=>{
  const save=create(), opened=openTrainingPack(save);
  expect(openTrainingPack(opened)).toBe(opened); expect(opened.items?.inventory).toHaveLength(1);
  const replay=openTrainingPack(structuredClone(save)); expect(replay.items).toEqual(opened.items);
  const used=useTrainingItem(opened,0); expect(used.items?.inventory).toHaveLength(0);
  expect(useTrainingItem(used,0)).toBe(used); expect(used.trained).toBe(false);
  expect(Object.values(used.player.skills).reduce((n,v)=>n+v,0)).toBe(Object.values(save.player.skills).reduce((n,v)=>n+v,0)+3);
  const next={...used,year:2027};expect(openTrainingPack(next).items?.inventory).toHaveLength(1);
});
it('MVP 12회는 실제 시즌 MVP만 세고 보상을 중복 지급하지 않는다',()=>{
  const save=create();
  save.seasons=Array.from({length:12},(_,i)=>({year:2026+i,age:19+i,teamId:'lg',hitter:null,pitcher:null,rank:1,ovr:90,awards:['시즌 MVP']}));
  expect(mvpCount(save)).toBe(12); awardCareerGoal(save);
  expect(save.mvpReward?.title).toBe('다이아몬드의 전설'); expect(save.items?.inventory).toEqual(['golden-bat']);
  awardCareerGoal(save);expect(save.items?.inventory).toHaveLength(1);
  save.seasons[0].awards=['아시안게임 MVP','MVP 후보'];expect(mvpCount(save)).toBe(11);
});
it('이전 부상은 복구하고 새 부상·피로·커리어 이벤트를 생성하지 않는다',()=>{
  let save=create();save.player.rosterStatus='INJURED';save.player.injuredUntil=9999;save.player.health=1;save.player.fatigue=99;save.pendingEvent='swing';
  while(save.phase!=='SEASON_RESULT')save=advanceRound(save,{interactive:false});
  expect(save.player.health).toBeGreaterThanOrEqual(20);expect(save.player.health).toBeLessThanOrEqual(100);expect(save.player.fatigue).toBe(0);expect(save.player.rosterStatus).not.toBe('INJURED');expect(save.pendingEvent).toBeNull();expect(save.eventsThisSeason).toBe(0);expect(save.league.hitters.user.pa).toBeGreaterThan(0);
},30000);
it('다년계약 트레이드는 연봉·잔여 계약·선수단 규모를 보존한다',()=>{
  const save=create();save.phase='SEASON_RESULT';save.player.contractYearsLeft=3;
  for(const key of Object.keys(save.player.skills))save.player.skills[key]=75;
  for(const team of save.league.standings)team.w=team.teamId==='lg'?0:20;
  const rng=new Rng(1);vi.spyOn(rng,'next').mockReturnValue(0);proposeTrade(save,rng);
  expect(save.pendingTrade).toBeTruthy();expect(()=>nextSeason(save)).toThrow('트레이드');
  const moved=resolveTrade(save,true);expect(moved.player.teamId).not.toBe('lg');expect(moved.player.salaryCR).toBe(save.player.salaryCR);expect(moved.player.contractYearsLeft).toBe(3);
  expect(nextSeason(moved).player.contractYearsLeft).toBe(2);
  for(const team of moved.league.standings)expect(moved.players.filter(p=>p.teamId===team.teamId)).toHaveLength(18);
  expect(resolveTrade(save,false).pendingTrade).toBeNull();
});
it('비FA 다년계약과 방출 후 재입단을 일반 FA와 구분한다',()=>{
  const save=create();save.phase='SEASON_RESULT';save.player.age=25;
  save.seasons=Array.from({length:2},(_,i)=>({year:2024+i,age:23+i,teamId:'lg',hitter:{...save.league.hitters.user},pitcher:null,rank:8,ovr:40}));
  for(const key of Object.keys(save.player.skills))save.player.skills[key]=75;
  save.contractOffers=createOffers(save,new Rng(1));expect(save.contractOffers.some(c=>c.kind==='EXTENSION')).toBe(true);
  const extension=signContract(save,save.contractOffers.findIndex(c=>c.kind==='EXTENSION'));expect(nextSeason(extension).player.contractYearsLeft).toBe(3);
  for(const key of Object.keys(save.player.skills))save.player.skills[key]=35;
  save.contractOffers=createOffers(save,new Rng(1));expect(save.contractOffers.every(c=>c.kind==='RELEASE')).toBe(true);
  expect(()=>nextSeason(save)).toThrow('계약');expect(signContract(save,0).player.teamId).not.toBe('lg');
});
it('성적 옵션·계약금 정산은 고정 연봉과 분리하고 연도당 한 번 반영한다',()=>{
  const save=create();save.contractHistory=[{teamId:'lg',salaryCR:7000,years:3,year:2026,opportunity:'STARTER',signingBonusCR:2000,option:{metric:'HITS',target:120,bonusCR:500}}];save.player.salaryCR=7000;save.league.hitters.user.h=120;
  settleContractYear(save);settleContractYear(save);expect(save.contractSettlements).toHaveLength(1);
  expect(save.contractSettlements?.[0]).toMatchObject({salaryCR:7000,signingBonusCR:2000,optionBonusCR:500});
  save.year=2027;save.league.hitters.user.h=119;settleContractYear(save);expect(save.contractSettlements?.[1]).toMatchObject({salaryCR:7000,signingBonusCR:0,optionBonusCR:0});
});
it('충분히 활약한 투수와 타자는 모두 시즌 MVP를 받을 수 있다',()=>{
  const save=createCareer({name:'에이스',role:'PITCHER',teamId:'lg',hand:'RIGHT'},1);
  Object.assign(save.league.pitchers.user,{g:28,gs:28,outs:540,so:200,er:50,wins:15});
  const mvp=()=>calculateAwards(save.league,save.players).find(a=>a.title==='시즌 MVP')?.playerId;
  expect(mvp()).toBe('user');Object.assign(save.league.hitters['lg-0'],{ab:550,pa:620,h:230,doubles:40,triples:3,hr:65,bb:70,rbi:160,runs:140,so:80});expect(mvp()).toBe('lg-0');
});
it('강한 지명타자는 중심 타순에서 충분히 출전하고 수비수에는 포함되지 않는다',()=>{
  let save=create();save.player.rosterStatus='STARTER';save.player.position='DH';
  for(const key of Object.keys(save.player.skills))save.player.skills[key]=99;
  for(let round=0;round<20;round++)save=advanceRound(save,{interactive:false});
  expect(save.league.hitters.user.pa).toBeGreaterThanOrEqual(75);
  while(save.phase!=='HIGHLIGHT_READY'&&save.league.round<45)save=advanceRound(save);
  expect(save.phase).toBe('HIGHLIGHT_READY');const club=save.pendingGame!.clubs.find(club=>club.lineup.includes('user'))!;
  expect(club.lineup.indexOf('user')).toBeLessThanOrEqual(3);expect(club.fielders).not.toContain('user');expect(club.fielders).toHaveLength(8);
},30000);
it('선발의 체력 육성은 실제 소화 이닝을 늘린다',()=>{
  const base=createCareer({name:'체력',role:'PITCHER',teamId:'lg',hand:'RIGHT'},11);base.player.pitchingRole='STARTER';
  for(const key of Object.keys(base.player.skills))base.player.skills[key]=90;
  let low=structuredClone(base),high=structuredClone(base);low.player.skills.stamina=45;high.player.skills.stamina=99;
  for(let round=0;round<5;round++){low=advanceRound(low,{interactive:false});high=advanceRound(high,{interactive:false});}
  expect(high.league.pitchers.user.outs).toBeGreaterThan(low.league.pitchers.user.outs);
});
