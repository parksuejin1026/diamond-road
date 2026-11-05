import type {LeagueSeason} from './season';
import type {Player} from '../domain/types';
import type {Award} from './awards';
export function youthCupAwards(league:LeagueSeason,players:Player[],champion:string):Award[]{
 const awards:Award[]=[];
 const pick=(title:string,candidates:Player[],score:(id:string)=>number)=>{
  const winner=[...candidates].sort((a,b)=>score(b.id)-score(a.id)||a.id.localeCompare(b.id))[0];if(winner)awards.push({title,playerId:winner.id});
 };
 const hitters=players.filter(p=>p.role==='HITTER'&&(league.hitters[p.id]?.pa??0)>0);
 const pitchers=players.filter(p=>p.role==='PITCHER'&&(league.pitchers[p.id]?.outs??0)>0);
 const performance=(id:string)=>{const h=league.hitters[id],p=league.pitchers[id];return h?h.h*2+h.hr*5+h.rbi*1.5+h.bb:p.outs+p.so*2-p.er*3+p.wins*3;};
 pick('대회 MVP',[...hitters,...pitchers].filter(p=>p.teamId===champion),performance);
 pick('타격상',hitters.filter(p=>league.hitters[p.id].pa>=12),id=>league.hitters[id].h/Math.max(1,league.hitters[id].ab));
 pick('타점상',hitters,id=>league.hitters[id].rbi);
 pick('우수투수상',pitchers.filter(p=>league.pitchers[p.id].outs>=9),performance);
 return awards;
}
