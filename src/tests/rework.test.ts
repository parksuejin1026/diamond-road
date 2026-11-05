import {buyShopItem,shopState,SHOP_ITEMS} from '../engine/shop';
import { expect,it } from 'vitest';
import { createCareer } from '../engine/career';
import { life,prepareLife,credit,effectiveSkills,answerMeeting,requestSalary } from '../engine/life';
import { advanceRound,nextSeason,playPostseason,retire } from '../engine/season';
import { developPlayer } from '../engine/development';
import { Rng } from '../engine/rng';
import { applyMilitary,military,simulateWorld,updateMilitary } from '../engine/international';
import { calculateAwards } from '../engine/awards';
import { legacyComparison,retiredNumber } from '../engine/legacy';
import { recordMoment } from '../engine/moments';
import { createGame } from '../engine/game';
const create=()=>createCareer({name:'개편 선수',role:'HITTER',teamId:'lg',hand:'RIGHT',style:1},31);
it('두 능력치 자동 성장은 재시작·재결산으로 중복 지급하거나 다시 추첨하지 않는다',()=>{
 const save=create(),selection=structuredClone(life(save).growth);prepareLife(save);expect(life(save).growth).toEqual(selection);
 const before={...save.player.skills};save.player.potential=99;developPlayer(save,new Rng(1));
 expect(Object.keys(before).filter(k=>save.player.skills[k]>before[k])).toEqual(expect.arrayContaining(selection!.skills));
 expect(Object.keys(before).filter(k=>save.player.skills[k]!==before[k])).toHaveLength(2);
 const after=structuredClone(save);developPlayer(save,new Rng(123));expect(save).toEqual(after);
});
it('첫 지원금 없이 시작하고 시즌 상품 3개 중 한 번만 구매한다',()=>{
 const original=create();expect(life(original).cash).toBe(0);
 const offers=shopState(original);expect(offers.stock).toHaveLength(3);expect(new Set(offers.stock).size).toBe(3);expect(shopState(structuredClone(original))).toEqual(offers);
 expect(buyShopItem(original,offers.stock[0])).toBe(original);credit(original,'test-funds',50000000,'검증용 자금');
 const item=SHOP_ITEMS.find(i=>i.id===offers.stock[0])!,bought=buyShopItem(original,item.id);
 expect(life(bought).cash).toBe(50000000-item.price);for(const[k,g]of Object.entries(item.effects))expect(bought.player.skills[k]).toBe(Math.min(99,original.player.skills[k]+g));
 expect(buyShopItem(bought,offers.stock[1])).toBe(bought);expect(bought.shop?.history).toHaveLength(1);expect(shopState({...bought,year:2027}).purchased).toBeNull();
});
it('낮은 멘탈과 건강은 원래 능력치를 보존하며 유효 경기력만 낮춘다',()=>{
 const save=create(),before={...save.player.skills};life(save).mentality=20;save.player.health=20;
 const effective=effectiveSkills(save.player,save);expect(effective.contact).toBeLessThan(before.contact);expect(effective.control??0).toBeLessThanOrEqual(before.control??0);expect(save.player.skills).toEqual(before);
 for(const key of Object.keys(before))expect(effective[key]).toBeGreaterThanOrEqual(before[key]*.85);
});
it('감독 면담은 제안이 있을 때 한 번만 처리하고 자유 포지션 전환을 대체한다',()=>{
 const save=create();life(save).meeting={year:save.year,position:'SS',selfRequest:false};
 const next=answerMeeting(save,'position',true);expect(next.player.position).toBe('SS');expect(next.players.find(p=>p.id==='user')?.position).toBe('SS');expect(answerMeeting(next,'position',true)).toBe(next);
});
it('매년 연봉 요구는 한 번이며 기존 시즌 정산 기록을 바꾸지 않는다',()=>{
 const save=create();save.phase='SEASON_RESULT';const salary=save.player.salaryCR;const next=requestSalary(save);
 expect(life(next).salaryRequests).toEqual([2026]);expect(requestSalary(next)).toBe(next);expect(save.player.salaryCR).toBe(salary);
});
it('정규시즌 후 포스트시즌에서 멈추고 별도 기록으로 한 번만 결산한다',()=>{
 let save=create();save.player.age=22;
 while(save.phase!=='POSTSEASON')save=advanceRound(save,{interactive:false});
 expect(save.seasons).toHaveLength(0);const stats=structuredClone(save.league);
 const result=playPostseason(save);expect(result.league).toEqual(stats);expect(result.seasons).toHaveLength(1);expect(playPostseason(result)).toBe(result);
 expect(life(result).ledger.filter(r=>r.id.startsWith('salary-')).reduce((n,r)=>n+r.amount,0)).toBe(save.player.salaryCR*10000);
},30000);
it('골든글러브는 같은 선수가 여러 포지션에서 중복 수상하지 않는다',()=>{
 const save=create();save.player.position='RF';Object.assign(save.league.hitters.user,{pa:600,ab:530,h:210,hr:40,bb:70});
 const awards=calculateAwards(save.league,save.players).filter(a=>a.title.includes('골든글러브'));
 expect(awards.filter(a=>a.playerId==='user')).toHaveLength(1);expect(new Set(awards.map(a=>a.playerId)).size).toBe(awards.length);
});
it('세계대회는 KBO 기록과 클럽 소속을 바꾸지 않고 중복 실행을 막는다',()=>{
 const save=create();save.year=2027;save.player.age=24;save.player.rosterStatus='STARTER';for(const k of Object.keys(save.player.skills))save.player.skills[k]=99;
 const league=structuredClone(save.league);simulateWorld(save);expect(save.world).toHaveLength(1);expect(save.world![0].selected).toBe(true);expect(save.league).toEqual(league);expect(save.player.teamId).toBe('lg');simulateWorld(save);expect(save.world).toHaveLength(1);expect(military(save).status).toBe('PENDING');
},30000);
it('세계대회 우승만으로 병역 상태를 바꾸지 않는다',()=>{
 const save=create();save.world=[{year:2027,selected:true,rank:1,games:[],hitter:null,pitcher:null}];updateMilitary(save);expect(military(save).status).toBe('PENDING');
});
it('일반 복무는 KBO 기록·FA 등록일을 늘리지 않고 복귀한다',()=>{
 let save=create();save.phase='SEASON_RESULT';save.player.age=22;save.contractService={days:145,faUses:0,lastFADays:0,activeRounds:0};
 save=applyMilitary(save,false);expect(military(save).status).toBe('REGULAR');const next=nextSeason(save);
 expect(next.military?.status).toBe('COMPLETED');expect(next.military?.monthsServed).toBe(18);expect(next.contractService?.days).toBe(145);expect(next.serviceRecords?.[0].games).toBe(0);expect(next.player.teamId).toBe(save.player.teamId);expect(next.year).toBe(2029);
});
it('짧은 은퇴 커리어는 임의의 실존 선수 유사도를 표시하지 않는다',()=>{const save=create();expect(legacyComparison(save)).toEqual([]);expect(retiredNumber(save)).toEqual([]);expect(retire(save).phase).toBe('RETIRED');});
it('상무 선발 후 별도 경기 기록을 남기고 원소속팀과 KBO 누적 기록을 보존한다',()=>{
 let enlisted:ReturnType<typeof create>|undefined;
 for(let seed=1;seed<=30;seed++){const save=createCareer({name:'상무 지원',role:'HITTER',teamId:'lg',hand:'RIGHT'},seed);save.phase='SEASON_RESULT';save.player.age=22;const next=applyMilitary(save,true);if(next.military?.status==='SANGMU'){enlisted=next;break;}}
 expect(enlisted).toBeTruthy();const result=nextSeason(enlisted!);expect(result.military?.status).toBe('COMPLETED');expect(result.serviceRecords?.[0].games).toBe(60);expect(result.serviceRecords?.[0].hitter?.g).toBeGreaterThan(0);expect(result.seasons).toHaveLength(0);expect(result.league.hitters.user.g).toBe(0);expect(result.player.teamId).toBe('lg');expect(life(result).cash).toBe(life(enlisted!).cash);
},30000);
it('중간 은퇴는 확정된 출전 기록을 보존하고 미지급 연봉을 지급하지 않는다',()=>{
 let save=create();save=advanceRound(save,{interactive:false});const cash=life(save).cash,result=retire(save);expect(result.seasons).toHaveLength(1);expect(result.seasons[0].hitter).toEqual(save.league.hitters.user);expect(life(result).cash).toBe(cash);expect(retire(result)).toBe(result);
});
it('끝내기 만루홈런은 실제 경기 상태로만 판정하고 동일 타석을 중복 기록하지 않는다',()=>{
 const save=create(),before=createGame();Object.assign(before,{inning:9,half:'BOTTOM',outs:2,bases:['a','b','c'],score:{home:3,away:6}});
 const after={...before,status:'FINAL' as const,score:{home:7,away:6}};
 save.pendingGame={fixture:{id:'final',round:145,homeTeamId:'lg',awayTeamId:'kia',stage:'한국시리즈'} as never,pa:1} as never;
 recordMoment(save,before,after,'HOME_RUN','user','kia-10');recordMoment(save,before,after,'HOME_RUN','user','kia-10');
 expect(save.moments).toHaveLength(1);expect(save.moments![0]).toMatchObject({walkoff:true,grandSlam:true,outs:2,inning:9});
});
