import type { CareerSave } from './career';
import { isYouth, graduationGrade } from './youth';
import { isAsianGamesYear, simulateAsianGames } from './asianGames';
import { simulateWorld, updateMilitary } from './international';
import { personalMoment } from './moments';
export type Decision = 'CAREER_EVENT'|'MEETING'|'MOMENT'|'ASIAN'|'WORLD'|'ASIAN_RESULT'|'WORLD_RESULT'|'CONTRACT'|'EDUCATION'|'MILITARY'|'MILITARY_RESULT';
export const decisionKey=(save:CareerSave,key:string)=>`${save.year}:${key}`;
export const acknowledged=(save:CareerSave,key:string)=>!!save.decisions?.includes(decisionKey(save,key));
export function acknowledge(original:CareerSave,key:string):CareerSave {
  if(acknowledged(original,key))return original;
  return {...original,decisions:[...(original.decisions??[]),decisionKey(original,key)]};
}
export function pendingDecision(save:CareerSave):Decision|null {
  if(save.pendingEvent)return 'CAREER_EVENT';
  const meeting=save.life?.meeting;
  if(save.phase==='PRESEASON'&&meeting&&!meeting.answered&&(meeting.style!==undefined||meeting.position))return 'MEETING';
  if(!['SEASON_RESULT','RETIRED'].includes(save.phase))return null;
  if(personalMoment(save)&&!acknowledged(save,'MOMENT'))return 'MOMENT';
  if(!isYouth(save)&&save.postseason){
    if(isAsianGamesYear(save.year)&&!save.asianGames?.some(r=>r.year===save.year))return 'ASIAN';
    if(save.asianGames?.some(r=>r.year===save.year)&&!acknowledged(save,'ASIAN_RESULT'))return 'ASIAN_RESULT';
    if(save.year>=2027&&(save.year-2027)%4===0&&!save.world?.some(r=>r.year===save.year))return 'WORLD';
    if(save.world?.some(r=>r.year===save.year)&&!acknowledged(save,'WORLD_RESULT'))return 'WORLD_RESULT';
  }
  if(save.phase==='SEASON_RESULT'&&save.requestedDecision==='MILITARY')return 'MILITARY';
  if(save.military?.history.some(h=>h.year===save.year)&&!acknowledged(save,'MILITARY_RESULT'))return 'MILITARY_RESULT';
  if(save.phase==='SEASON_RESULT'&&(save.pendingTrade||save.contractOffers.length))return 'CONTRACT';
  if(save.phase==='SEASON_RESULT'&&isYouth(save)&&save.youth!.grade===graduationGrade(save))return 'EDUCATION';
  return null;
}
export function resolveTournament(original:CareerSave,kind:'ASIAN'|'WORLD',participate:boolean):CareerSave {
  if(pendingDecision(original)!==kind)return original;
  const save=structuredClone(original);
  if(kind==='ASIAN')simulateAsianGames(save,participate);else simulateWorld(save,participate);
  updateMilitary(save);save.players=save.players.map(p=>p.id===save.player.id?save.player:p);
  return save;
}
