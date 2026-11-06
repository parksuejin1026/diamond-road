import {resolveDecisions} from '../src/tests/resolve-decisions';
import {buyShopItem,shopState,SHOP_ITEMS} from '../src/engine/shop';
import { afterAll, expect, it } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createCareer, train } from '../src/engine/career';
import { advanceRound, nextSeason } from '../src/engine/season';
import { resolveTrade, signContract } from '../src/engine/contracts';
import { isYouth, signDraft } from '../src/engine/youth';
import { SCHOOLS } from '../src/engine/schools';
import { openTrainingPack, useTrainingItem, TRAINING_ITEMS } from '../src/engine/items';
import { selectFocus } from '../src/engine/development';
import { mvpCount } from '../src/engine/achievements';
const results: object[]=[];
it.each(Array.from({length:10},(_,i)=>i+1))('seed %i: 준비·아이템·고교·국제대회·계약·은퇴 전체 커리어',seed=>{
  const role=seed%2?'HITTER':'PITCHER';
  let save=createCareer({name:'밸런스 '+seed,role,teamId:'lg',hand:'RIGHT',schoolId:SCHOOLS[seed].id,style:seed%3},seed);
  let steps=0,peak=45; const seasons: object[]=[];
  while(save.phase!=='RETIRED'&&steps++<5000){
    if(save.phase==='DRAFT')save=signDraft(save);
    else if(save.phase==='SEASON_RESULT'){
      const winner=save.awards.find(a=>a.title==='시즌 MVP')?.playerId;
      seasons.push({year:save.year,ovr:save.seasons.at(-1)?.ovr,user:save.league.hitters.user??save.league.pitchers.user,role:save.player.pitchingRole,winner,winnerStats:winner?save.league.hitters[winner]??save.league.pitchers[winner]:null});
      if(save.pendingTrade)save=resolveTrade(save,true);
      if(save.contractOffers.length){const offer=save.contractOffers.findIndex(c=>c.kind==='FA'&&c.teamId!==save.player.teamId);save=signContract(save,offer>=0?offer:0);}
      save=nextSeason(resolveDecisions(save));
    }else{
      if(save.phase==='PRESEASON'){
        const offered=shopState(save).stock.map(id=>SHOP_ITEMS.find(i=>i.id===id)!).sort((a,b)=>b.price-a.price);
        for(const item of offered){const next=buyShopItem(save,item.id);if(next!==save){save=next;break;}}
      }
      save=advanceRound(save,{interactive:false,events:false});
    }
    peak=Math.max(peak,...save.seasons.map(s=>s.ovr));
  }
  expect(save.phase).toBe('RETIRED');expect(save.player.age).toBe(38);expect(save.seasons).toHaveLength(20);expect(save.youth?.history).toHaveLength(3);
  expect(new Set(save.seasons.map(s=>s.year)).size).toBe(20);expect(save.pendingEvent).toBeNull();expect(save.player.fatigue).toBe(0);
  expect(new Set(save.contractSettlements?.map(s=>s.year)).size).toBe(save.contractSettlements?.length);
  for(const player of save.players)for(const value of Object.values(player.skills)){expect(value).toBeGreaterThanOrEqual(1);expect(value).toBeLessThanOrEqual(99);}
  const result={seed,role,peak,mvp:mvpCount(save),clubs:new Set(save.seasons.map(s=>s.teamId)).size,nationalSelections:save.asianGames?.filter(r=>r.selected).length??0,championships:save.seasons.filter(s=>s.championship).length,salary:save.player.salaryCR,steps,seasons};
  results.push(result);console.log('CAREER_RESULT',JSON.stringify({...result,seasons:undefined}));
});
afterAll(()=>{mkdirSync('artifacts',{recursive:true});writeFileSync(results.length===10?'artifacts/balance-careers.json':'artifacts/balance-diagnostic.json',JSON.stringify(results,null,2));});
