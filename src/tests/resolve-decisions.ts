import type {CareerSave} from '../engine/career';
import {pendingDecision,acknowledge,resolveTournament} from '../engine/decisions';
import {signContract,resolveTrade} from '../engine/contracts';
import {answerMeeting} from '../engine/life';
import {chooseEvent} from '../engine/events';
// Explicit choices for simulations. Production never calls this helper.
export function resolveDecisions(original:CareerSave):CareerSave {
 let save=original;
 for(let i=0;i<12;i++){
  const kind=pendingDecision(save);if(!kind||kind==='EDUCATION')return save;
  if(kind==='MILITARY')save={...save,requestedDecision:undefined};
  else if(kind==='ASIAN'||kind==='WORLD')save=resolveTournament(save,kind,true);
  else if(kind==='CONTRACT')save=save.pendingTrade?resolveTrade(save,false):signContract(save,0);
  else if(kind==='MEETING')save=answerMeeting(save,'style',false);
  else if(kind==='CAREER_EVENT')save=chooseEvent(save,save.pendingEvent!,0);
  else save=acknowledge(save,kind);
 }
 throw new Error('Unresolved decision queue');
}
