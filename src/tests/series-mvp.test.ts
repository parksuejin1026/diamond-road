import {expect,it} from 'vitest';
import {createCareer} from '../engine/career';
import {emptyHitter,emptyPitcher,emptyLeague} from '../engine/season';
import {calculateSeriesMvp} from '../engine/seriesMvp';
import {pendingHonor} from '../engine/awardCeremony';
import {mvpCount} from '../engine/achievements';

it('한국시리즈 MVP는 우승팀의 실제 출전 선수 중에서만 선정한다',()=>{
 const save=createCareer({name:'시리즈',role:'HITTER',hand:'RIGHT',teamId:'lg'},7),league=emptyLeague(save.players);
 league.hitters.user={...emptyHitter(),pa:20,ab:18,h:10,hr:2,rbi:7};
 const rival=save.players.find(p=>p.role==='HITTER'&&p.teamId!=='lg')!;
 league.hitters[rival.id]={...emptyHitter(),pa:30,ab:25,h:25,hr:20};
 const before=structuredClone(league);
 expect(calculateSeriesMvp(league,save.players,'lg')).toEqual({title:'한국시리즈 MVP',playerId:'user'});
 expect(league).toEqual(before);
 expect(calculateSeriesMvp(emptyLeague(save.players),save.players,'lg')).toBeNull();
});
it('타자만이 아니라 시리즈에서 활약한 투수도 선정하며 동점 결과는 재현된다',()=>{
 const save=createCareer({name:'시리즈 투수',role:'PITCHER',hand:'RIGHT',teamId:'lg'},7),league=emptyLeague(save.players);
 league.pitchers.user={...emptyPitcher(),g:2,outs:42,so:18,er:1,hits:7,bb:2};
 const batter=save.players.find(p=>p.role==='HITTER'&&p.teamId==='lg')!;
 league.hitters[batter.id]={...emptyHitter(),pa:20,ab:18,h:4,hr:1};
 expect(calculateSeriesMvp(league,save.players,'lg')?.playerId).toBe('user');
 expect(calculateSeriesMvp(league,save.players,'lg')).toEqual(calculateSeriesMvp(league,[...save.players].reverse(),'lg'));
});
it('한국시리즈 MVP는 개인 이력에 남으며 시즌 MVP 목표와 대형 시상식에는 포함되지 않는다',()=>{
 const save=createCareer({name:'개인 수상',role:'HITTER',hand:'RIGHT',teamId:'lg'},7);save.phase='SEASON_RESULT';
 save.awards=[{title:'한국시리즈 MVP',playerId:'user'}];
 save.seasons=[{year:save.year,age:19,teamId:'lg',rank:1,ovr:60,hitter:null,pitcher:null,awards:['한국시리즈 MVP'],championship:true}];
 expect(pendingHonor(save)).toBeUndefined();expect(mvpCount(save)).toBe(0);
});
