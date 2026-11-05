import type { CareerSave } from './career';
import type { Player } from '../domain/types';
import { PLAYER_STYLES } from './roster';
import { Rng } from './rng';

export const skillNames: Record<string,string> = {contact:'컨택',power:'파워',eye:'선구안',speed:'주력',defense:'수비',mental:'정신력',velocity:'구속',control:'제구',breaking:'변화구',stamina:'체력'};
export const won = (amount:number) => `${Math.round(amount).toLocaleString('ko-KR')}원`;
export const contractMoney = (amount:number) => won(amount * 10000);
export const COACHING_PRICES=[1000000,1800000,2500000] as const;
export interface Life {
  version: 1; cash: number; mentality: number; style: number; appearance: number; number: number;
  routine: 'BALANCED'|'FOOD'|'HOBBY'|'REST';
  ledger: {id:string;year:number;amount:number;reason:string}[];
  purchases: {year:number;gain:number}[];
  growth?: {year:number;skills:string[];gains:number[]};
  meeting?: {year:number;style?:number;position?:string;answered?:boolean;message?:string;selfRequest?:boolean};
  adaptation?: {year:number;position:string};
  salaryRequests: number[]; news: {year:number;text:string}[];
}
export function life(save:CareerSave):Life {
  if (!save.life) {
    const settlements = save.contractSettlements ?? [];
    save.life = {version:1,cash:settlements.reduce((n,s)=>n+(s.salaryCR+s.signingBonusCR+s.optionBonusCR)*10000,0)+(save.seasons.length===0?1000000:0),mentality:85,style:0,appearance:save.seed%12,number:save.seed%98+1,routine:'BALANCED',ledger:[],purchases:[],salaryRequests:[],news:[]};
    if (settlements.length) save.life.ledger.push({id:'migration',year:save.year,amount:save.life.cash,reason:'이전 계약 정산 이력 이전'});
    else if(save.life.cash)save.life.ledger.push({id:'initial-support',year:save.year,amount:save.life.cash,reason:'첫 커리어 육성 지원금'});
  }
  return save.life;
}
export function credit(save:CareerSave,id:string,amount:number,reason:string) {
  const state=life(save); if(state.ledger.some(row=>row.id===id))return;
  amount=Math.round(amount); if(!Number.isSafeInteger(amount)||state.cash+amount<0)throw new Error('잔액을 확인해 주세요.');
  state.cash+=amount; state.ledger.push({id,year:save.year,amount,reason});
}
export function prepareLife(save:CareerSave) {
  const state=life(save); if(state.growth?.year===save.year)return;
  const rng=new Rng((save.seed ^ save.year*7919)>>>0);
  const profile=PLAYER_STYLES[save.player.role][state.style] ?? PLAYER_STYLES[save.player.role][0];
  const candidates=Object.keys(save.player.skills).filter(k=>save.player.skills[k]<99);
  const skills:string[]=[];
  while(skills.length<2&&candidates.length){
    const weights=candidates.map(k=>Math.max(1,profile.skills[k]-32));
    let roll=rng.next()*weights.reduce((a,b)=>a+b,0); let index=0;
    while(index<weights.length-1 && (roll-=weights[index])>=0)index++;
    skills.push(candidates.splice(index,1)[0]);
  }
  state.growth={year:save.year,skills,gains:skills.map(()=>save.player.age<19?rng.int(5,8):save.player.age<26?rng.int(2,4):rng.int(1,3))};
  const style=rng.next()<.16?(state.style+1+rng.int(0,1))%3:undefined;
  const positions=save.player.role==='HITTER'?['C','1B','2B','3B','SS','LF','CF','RF','DH'].filter(p=>p!==save.player.position):[];
  const position=positions.length&&rng.next()<.17?positions[rng.int(0,positions.length-1)]:undefined;
  state.meeting={year:save.year,style,position,selfRequest:rng.next()<.3};
}
export function effectiveSkills(player:Player, save:CareerSave) {
  if(player.id!==save.player.id)return player.skills;
  const state=life(save); const mind=Math.max(0,70-state.mentality)/70; const body=Math.max(0,70-player.health)/70;
  return Object.fromEntries(Object.entries(player.skills).map(([key,value])=>[key,Math.max(1,value*(1-Math.min(.15,(key==='eye'||key==='control'||key==='mental'||key==='defense'?.10*mind:.04*mind)+.10*body)))]));
}
export function manage(save:CareerSave, routine:Life['routine']):CareerSave {
  if(save.phase!=='PRESEASON')return save;
  const next=structuredClone(save);life(next).routine=routine;return next;
}
export function buyGrowth(save:CareerSave,skill:string,tier:number):CareerSave {
  if(save.phase!=='PRESEASON'||!(skill in save.player.skills)||![0,1,2].includes(tier))return save;
  const next=structuredClone(save), state=life(next), gain=tier+1;
  const used=state.purchases.filter(p=>p.year===save.year).reduce((n,p)=>n+p.gain,0);
  const price=COACHING_PRICES[tier]*(save.player.skills[skill]>=80?2:1);
  if(used+gain>6||state.cash<price||save.player.skills[skill]+gain>99)return save;
  credit(next,`purchase-${save.year}-${state.purchases.length}`,-price,`${skillNames[skill]} 개인 코칭`);
  next.player.skills[skill]=Math.min(99,next.player.skills[skill]+gain);state.purchases.push({year:save.year,gain});
  next.players=next.players.map(p=>p.id===next.player.id?next.player:p);return next;
}
export function recover(save:CareerSave):CareerSave {
  if(save.phase!=='PRESEASON'||life(save).ledger.some(r=>r.id===`care-${save.year}`))return save;
  const next=structuredClone(save);credit(next,`care-${save.year}`,0,'시즌 전 무료 회복');
  next.player.health=Math.min(100,next.player.health+15);life(next).mentality=Math.min(100,life(next).mentality+15);return next;
}
export function conditionRound(save:CareerSave,rng:Rng){
  const state=life(save),round=save.league.round;
  const period=save.youth&&!save.youth.graduated?2:12;
  if(round%period)return;
  const routine=state.routine;
  save.player.health=Math.max(20,Math.min(100,save.player.health+rng.int(-6,1)+(routine==='FOOD'?4:routine==='REST'?3:2)-(save.player.age>=33?1:0)));
  const h=save.league.hitters[save.player.id],p=save.league.pitchers[save.player.id];
  const slump=h?h.ab>=40&&h.h/h.ab<.22:!!p&&p.outs>=45&&p.er*27/p.outs>5.5;
  const resilient=(save.player.skills.mental??40)>=70;
  const games=save.league.results.filter(g=>g.homeTeamId===save.player.teamId||g.awayTeamId===save.player.teamId).slice(-3);
  const losses=games.filter(g=>g.homeTeamId===save.player.teamId?g.home<g.away:g.away<g.home).length;
  state.mentality=Math.max(20,Math.min(100,state.mentality+rng.int(-5,3)+(routine==='HOBBY'?4:routine==='REST'?2:1)-(slump&&!resilient?2:0)-(losses===3?1:0)));
}
export function answerMeeting(save:CareerSave,kind:'style'|'position',accept:boolean):CareerSave {
  if(save.phase!=='PRESEASON')return save;
  const next=structuredClone(save),state=life(next),meeting=state.meeting;if(!meeting||meeting.answered)return save;
  if(accept&&kind==='style'&&meeting.style!==undefined){state.style=meeting.style;state.growth=undefined;prepareLife(next);}
  let approved=accept;
  if(accept&&kind==='position'&&meeting.position){
    const rng=new Rng((save.seed^save.year*6719)>>>0);
    approved=!meeting.selfRequest||rng.next()<.35+(save.youth?.trust??50)/200;
    if(approved){next.player.position=meeting.position as Player['position'];state.adaptation={year:save.year,position:meeting.position};}
  }
  const message=approved?'감독과 새 방향에 합의했습니다.':accept?'팀 구성과 현재 적성을 이유로 포지션 요청이 거절됐습니다.':'기존 방향을 유지합니다.';
  state.meeting={...meeting,answered:true,message};state.news.push({year:save.year,text:message});
  next.players=next.players.map(p=>p.id===next.player.id?next.player:p);return next;
}
export function requestSalary(save:CareerSave):CareerSave {
  if(save.phase!=='SEASON_RESULT'||(save.youth&&!save.youth.graduated)||life(save).salaryRequests.includes(save.year))return save;
  const next=structuredClone(save),state=life(next);state.salaryRequests.push(save.year);
  const h=save.league.hitters[save.player.id],p=save.league.pitchers[save.player.id];
  const strong=h?h.pa>=150&&h.h/Math.max(1,h.ab)>=.27:!!p&&p.outs>=150&&p.er*27/p.outs<4.2;
  const rng=new Rng((save.seed^save.year*3571)>>>0),accepted=rng.next()<(strong?.8:.25);
  if(accepted){
    const salary=Math.ceil(save.player.salaryCR*(strong?1.15:1.05)/100)*100;
    if(next.contractOffers.length)next.contractOffers=next.contractOffers.map(o=>o.teamId===next.player.teamId?{...o,salaryCR:Math.max(o.salaryCR,salary)}:o);
    else {next.player.salaryCR=salary; const active=next.contractHistory.findLast(c=>c.year+c.years>save.year);if(active)active.salaryCR=salary;}
  }
  state.news.push({year:save.year,text:accepted?'구단이 다음 시즌 연봉 인상 요구를 받아들였습니다.':'구단이 성적과 예산을 이유로 연봉 인상 요구를 거절했습니다.'});
  state.mentality=Math.max(20,Math.min(100,state.mentality+(accepted?3:-3)));
  return next;
}
