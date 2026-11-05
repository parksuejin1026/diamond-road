import type { CareerSave } from './career';
import type { GameState, PAResult } from '../domain/types';
export interface Moment {id:string;year:number;kind:'HOME_RUN'|'CATCH'|'STRIKEOUT'|'CHAMPION';name:string;inning:number;outs:number;bases:number;before:string;after:string;walkoff:boolean;grandSlam:boolean;stage:string;}
export function recordMoment(save:CareerSave,before:GameState,after:GameState,result:PAResult,batter:string,pitcher:string){
  const pending=save.pendingGame!;
  const stage=(pending.fixture as {stage?:string}).stage;
  if(!stage)return;
  const own=[pending.fixture.homeTeamId,pending.fixture.awayTeamId].includes(save.player.teamId);
  if(!own)return;
  const fielder=save.fieldingPlay;save.fieldingPlay=undefined;
  const kind=result==='HOME_RUN'?'HOME_RUN':fielder?'CATCH':result==='STRIKEOUT'&&pitcher===save.player.id?'STRIKEOUT':null;
  if(!kind)return;
  const actor=kind==='HOME_RUN'?batter:kind==='CATCH'?fielder!:pitcher;
  const walkoff=before.half==='BOTTOM'&&before.inning>=9&&after.status==='FINAL'&&after.score.home>after.score.away;
  const moment:Moment={id:`${save.year}-${pending.fixture.id}-${pending.pa}`,year:save.year,kind,name:save.players.find(p=>p.id===actor)?.name??'',inning:before.inning,outs:before.outs,bases:before.bases.filter(Boolean).length,before:`${before.score.away} : ${before.score.home}`,after:`${after.score.away} : ${after.score.home}`,walkoff,grandSlam:result==='HOME_RUN'&&before.bases.every(Boolean),stage};
  save.moments??=[];if(save.moments.some(m=>m.id===moment.id))return;
  if(save.moments.filter(m=>m.year===save.year).length<30||walkoff||actor===save.player.id)save.moments.push(moment);
}
