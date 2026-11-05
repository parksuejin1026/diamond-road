import type { CareerSave } from './career';
import data from '../data/retired-players.json';
import { emptyHitter, emptyPitcher } from './season';
export function legacyComparison(save:CareerSave){
  const h=emptyHitter(),p=emptyPitcher();
  for(const s of save.seasons){if(s.hitter)for(const k of Object.keys(h) as (keyof typeof h)[])h[k]=(h[k]??0)+(s.hitter[k]??0);if(s.pitcher)for(const k of Object.keys(p) as (keyof typeof p)[])p[k]+=s.pitcher[k];}
  if(save.player.role==='HITTER'&&h.ab<300||save.player.role==='PITCHER'&&p.outs<300)return [];
  const hitter=(x:{ab:number;h:number;hr:number;bb:number;g:number})=>[x.h/x.ab/.35,x.hr/x.ab/.08,x.bb/x.ab/.2,Math.log1p(x.g)/Math.log(2501)];
  const pitcher=(x:{outs:number;so:number;er:number;wins:number;g:number})=>[x.er*27/x.outs/6,x.so*27/x.outs/12,x.wins/Math.max(1,x.g),Math.log1p(x.outs)/Math.log(9001)];
  const user=save.player.role==='HITTER'?hitter(h):pitcher(p);
  const candidates=save.player.role==='HITTER'?data.hitters.map(x=>({name:x.name,vector:hitter(x)})):data.pitchers.map(x=>({name:x.name,vector:pitcher(x)}));
  return candidates.map(x=>({name:x.name,similarity:Math.round(100*Math.exp(-2*Math.sqrt(x.vector.reduce((n,v,i)=>n+(v-user[i])**2,0)/4)))})).sort((a,b)=>b.similarity-a.similarity).slice(0,3);
}
export function retiredNumber(save:CareerSave){
  const teams=[...new Set(save.seasons.map(s=>s.teamId))];
  return teams.filter(id=>{const seasons=save.seasons.filter(s=>s.teamId===id);return seasons.length>=10&&seasons.reduce((n,s)=>n+(s.awards?.length??0),0)>=8&&seasons.some(s=>s.championship)&&!save.life?.news.some(n=>n.text.includes('친정 팬들의 야유')&&save.seasons.find(s=>s.year===n.year)?.teamId===id);});
}
