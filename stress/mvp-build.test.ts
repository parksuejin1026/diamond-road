import { buyGrowth, recover, manage } from '../src/engine/life';
import { expect,it } from 'vitest';
import { mkdirSync,writeFileSync } from 'node:fs';
import { createCareer,train } from '../src/engine/career';
import { advanceRound,nextSeason } from '../src/engine/season';
import { signDraft } from '../src/engine/youth';
import { signContract,resolveTrade } from '../src/engine/contracts';
import { selectFocus } from '../src/engine/development';
import { TRAINING_ITEMS,openTrainingPack,useTrainingItem } from '../src/engine/items';
import { mvpCount } from '../src/engine/achievements';
import { SCHOOLS } from '../src/engine/schools';
it('현금과 자동 육성의 정상 경로로 MVP 목표에 도전하고 수상 결과를 보존한다',()=>{
  let save=createCareer({name:'공격형 지명타자',role:'HITTER',teamId:'lg',hand:'RIGHT',schoolId:SCHOOLS[0].id,position:'DH',style:1,focus:'contact'},3);
  let steps=0;
  while(save.phase!=='RETIRED'&&steps++<5000){
    if(save.phase==='DRAFT')save=signDraft(save);
    else if(save.phase==='SEASON_RESULT'){
      if(save.pendingTrade)save=resolveTrade(save,false);
      if(save.contractOffers.length)save=signContract(save,0);
      save=nextSeason(save);
    }else{
      if(save.phase==='PRESEASON'){
        save=recover(manage(save,'BALANCED'));
        const preferred=save.player.role==='HITTER'?['power','contact','eye','speed','defense','mental']:['control','velocity','stamina','breaking','mental'];
        let spent=0;
        while(spent++<6){
          const skill=preferred.filter(k=>save.player.skills[k]<99).sort((a,b)=>save.player.skills[a]-save.player.skills[b])[0];
          if(!skill)break;
          const next=buyGrowth(save,skill,0);if(next===save)break;save=next;
        }
      }
      save=advanceRound(save,{interactive:false,events:false});
    }
  }
  const result={seed:3,strategy:'trait growth; balanced routine; annual cash coaching of weakest skill',mvp:mvpCount(save),seasons:save.seasons.map(s=>({year:s.year,ovr:s.ovr,awards:s.awards,hitter:s.hitter})),reward:save.mvpReward,age:save.player.age};
  mkdirSync('artifacts',{recursive:true});writeFileSync('artifacts/mvp-build.json',JSON.stringify(result,null,2));
  console.log('MVP_BUILD',JSON.stringify({mvp:result.mvp,age:result.age,reward:result.reward}));
  expect(save.phase).toBe('RETIRED');expect(save.seasons).toHaveLength(20);
  expect(result.mvp).toBeGreaterThan(0);if(result.mvp>=12)expect(save.mvpReward).toBeTruthy();
});
