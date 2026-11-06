import type { CareerSave } from './career';
import type { GameResult } from './season';
import { emptyLeague, simulateInternationalFixture } from './season';
import { makePlayer } from './roster';
import { overall } from '../domain/calculators';
import { Rng } from './rng';
import { credit, life } from './life';
export const WORLD_TEAMS=[{id:'kor',name:'대한민국',strength:76},{id:'jpn',name:'일본',strength:85},{id:'usa',name:'미국',strength:86},{id:'dom',name:'도미니카',strength:83},{id:'tpe',name:'대만',strength:73},{id:'mex',name:'멕시코',strength:79},{id:'ven',name:'베네수엘라',strength:80},{id:'cub',name:'쿠바',strength:74}];
export interface WorldReport { participated?:boolean;year:number;selected:boolean;rank:number;games:GameResult[];hitter:import('../domain/types').HitterStats|null;pitcher:import('../domain/types').PitcherStats|null;}
export interface Military {status:'PENDING'|'ATHLETE'|'SANGMU'|'REGULAR'|'COMPLETED';appliedYears:number[];startYear?:number;monthsServed:number;history:{year:number;text:string}[];}
export function military(save:CareerSave):Military{return save.military??={status:'PENDING',appliedYears:[],monthsServed:0,history:[]};}
export function simulateWorld(save:CareerSave, participate=true){
  if(save.year<2027||(save.year-2027)%4||(save.youth&&!save.youth.graduated)||save.world?.some(r=>r.year===save.year))return;
  const rng=new Rng((save.seed^save.year^0x57bcd)>>>0);
  const korean=(['HITTER','PITCHER'] as const).flatMap(role=>save.players.filter(p=>p.role===role&&(participate||p.id!==save.player.id)&&p.rosterStatus!=='MINORS').sort((a,b)=>overall(b)-overall(a)||a.id.localeCompare(b.id)).slice(0,12)).map(p=>({...structuredClone(p),teamId:'kor'}));
  const selected=korean.some(p=>p.id===save.player.id),players=[...korean];
  for(const team of WORLD_TEAMS.slice(1))for(let i=0;i<24;i++){
    const p=makePlayer(`world-${team.id}-${i}`,`${team.name} ${i+1}`,i<12?'HITTER':'PITCHER',team.id,rng);
    p.skills=Object.fromEntries(Object.keys(p.skills).map(k=>[k,Math.max(1,Math.min(99,team.strength+rng.int(-9,9)))]));players.push(p);
  }
  const player=players.find(p=>p.id===save.player.id)??players[0];player.rosterStatus='STARTER';
  const cup:CareerSave={...save,life:structuredClone(life(save)),player,players,youth:null,moments:[],league:emptyLeague(players),pendingGame:null};
  if(!selected)life(cup).mentality=100;
  let count=0;const play=(a:string,b:string,stage:string)=>{
    const result=simulateInternationalFixture(cup,{id:`world-${save.year}-${++count}`,round:count,homeTeamId:a,awayTeamId:b},rng);result.stage=stage;return result.home>result.away?a:b;
  };
  let entrants=WORLD_TEAMS.map(t=>t.id),rank=8;
  for(const stage of ['8강','준결승','결승']){
    const next:string[]=[];
    for(let i=0;i<entrants.length;i+=2){const winner=play(entrants[i],entrants[i+1],`세계대회 ${stage}`);next.push(winner);if([entrants[i],entrants[i+1]].includes('kor'))rank=winner==='kor'?Math.max(1,entrants.length/2):entrants.length/2+1;}
    entrants=next;
  }
  save.world=[...(save.world??[]),{year:save.year,participated:participate,selected,rank,games:cup.league.results,hitter:selected&&save.player.role==='HITTER'?cup.league.hitters.user:null,pitcher:selected&&save.player.role==='PITCHER'?cup.league.pitchers.user:null}];
  if(selected){credit(save,`world-prize-${save.year}`,rank===1?20000000:5000000,'세계 야구 대회 상금');save.player.reputation=Math.min(100,(save.player.reputation??0)+(rank===1?10:3));}
}
export function updateMilitary(save:CareerSave){
  const state=military(save);if(state.status!=='PENDING')return;
  const gold=save.asianGames?.find(r=>r.selected&&r.medal==='GOLD'&&((r.hitter?.pa??0)>0||(r.pitcher?.outs??0)>0));
  if(gold){state.status='ATHLETE';state.history.push({year:save.year,text:'아시안게임 금메달 및 실제 출전으로 체육요원 편입. 기본훈련·봉사 등 의무는 간소화합니다.'});}
}
export function applyMilitary(save:CareerSave,sangmu:boolean):CareerSave{
  if(save.phase!=='SEASON_RESULT'||(save.youth&&!save.youth.graduated)||save.player.age<19||military(save).status!=='PENDING'||military(save).appliedYears.includes(save.year))return save;
  const next=structuredClone(save),state=military(next);state.appliedYears.push(save.year);
  const rng=new Rng((save.seed^save.year*1129)>>>0);const accepted=!sangmu||(save.player.age<=27&&rng.next()<Math.max(.15,Math.min(.85,(overall(save.player)-35)/65)));
  if(accepted){state.status=sangmu?'SANGMU':'REGULAR';state.startYear=save.year+1;state.monthsServed=0;state.history.push({year:save.year,text:sangmu?'상무 선발에 합격했습니다. 다음 시즌부터 18개월 복무하며 퓨처스에서 성장합니다.':'다음 시즌부터 일반 복무를 시작합니다. 18개월 복무 후 복귀합니다.'});}
  else state.history.push({year:save.year,text:'상무 선발에서 탈락했습니다. 다음 해 재지원하거나 일반 복무를 선택할 수 있습니다.'});
  return next;
}
