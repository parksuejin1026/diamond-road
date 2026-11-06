import type {CareerSave} from './career';
import {Rng} from './rng';
import {PLAYER_STYLES,playStyle,styleRedistribution} from './playStyles';
export interface SeasonTurningPoint {year:number;round:number;status:'NONE'|'SCHEDULED'|'PENDING'|'RESOLVED';kind?:'STYLE'|'FOCUS';style?:number;focus?:string;accepted?:boolean;acknowledged?:boolean;beforeSkills?:Record<string,number>;afterSkills?:Record<string,number>;}
export function planTurningPoint(save:CareerSave){
  if(!save.life||save.life.turningPoint?.year===save.year)return;
  const rng=new Rng((save.seed^save.year*35771^0x57a1e)>>>0),rounds=Math.max(...save.schedule.map(g=>g.round));
  const earliest=Math.max(save.league.round+1,Math.ceil(rounds*.25)),latest=Math.floor(rounds*.8);
  if(rng.next()>=.42||earliest>latest){save.life.turningPoint={year:save.year,round:0,status:'NONE'};return;}
  const event:SeasonTurningPoint={year:save.year,round:rng.int(earliest,latest),status:'SCHEDULED'};
  if(rng.next()<.7){
    const candidates=PLAYER_STYLES[save.player.role].map((_,i)=>i).filter(i=>i!==save.life!.style);
    event.kind='STYLE';event.style=candidates[rng.int(0,candidates.length-1)];
  }else{
    const preferred=save.focusSkill??save.youth?.focus??playStyle(save.player.role,save.life.style).growth[0];
    const candidates=Object.keys(save.player.skills).filter(k=>k!==preferred&&save.player.skills[k]<99);
    if(!candidates.length){save.life.turningPoint={year:save.year,round:0,status:'NONE'};return;}
    event.kind='FOCUS';event.focus=candidates[rng.int(0,candidates.length-1)];
  }
  save.life.turningPoint=event;
}
export function triggerTurningPoint(save:CareerSave){
  const event=save.life?.turningPoint;
  if(event?.year===save.year&&event.status==='SCHEDULED'&&save.league.round>=event.round&&save.phase==='SIMULATING')event.status='PENDING';
}
export function answerTurningPoint(original:CareerSave,accept:boolean):CareerSave {
  const event=original.life?.turningPoint;
  if(!event||event.year!==original.year||event.status!=='PENDING'||original.phase!=='SIMULATING'||original.pendingGame)return original;
  const save=structuredClone(original),state=save.life!,next=state.turningPoint!;
  next.beforeSkills={...save.player.skills};next.accepted=accept;
  if(accept&&next.kind==='STYLE'&&next.style!==undefined){
    const beforeStyle=state.style;save.player.skills=styleRedistribution(save.player.skills,save.player.role,next.style);state.style=next.style;
    save.focusSkill=playStyle(save.player.role,next.style).growth[0];if(save.youth)save.youth.focus=save.focusSkill;
    state.styleHistory??=[];state.styleHistory.push({year:save.year,round:save.league.round,from:beforeStyle,to:next.style});
  }else if(accept&&next.kind==='FOCUS'&&next.focus&&next.focus in save.player.skills){save.focusSkill=next.focus;if(save.youth)save.youth.focus=next.focus;}
  next.afterSkills={...save.player.skills};next.status='RESOLVED';next.acknowledged=false;
  if(accept){state.growth=undefined;}
  save.players=save.players.map(p=>p.id===save.player.id?save.player:p);
  return save;
}
export function acknowledgeTurningPoint(original:CareerSave):CareerSave {
  if(original.life?.turningPoint?.status!=='RESOLVED'||original.life.turningPoint.acknowledged)return original;
  const save=structuredClone(original);save.life!.turningPoint!.acknowledged=true;return save;
}
