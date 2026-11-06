import type {Role,Skills} from '../domain/types';
export interface PlayStyle {name:string;description:string;approach:string;growth:readonly [string,string];skills:Skills;}
// Stable indexes 0–2 preserve the meaning of existing saves. Values are game tuning.
export const PLAYER_STYLES:Record<Role,PlayStyle[]>={
  HITTER:[
    {name:'교타형',description:'컨택 · 선구안',approach:'공을 배트에 맞히고 안타를 쌓는 타격',growth:['contact','eye'],skills:{contact:52,power:38,eye:48,speed:45,defense:40,mental:42}},
    {name:'거포형',description:'파워 · 컨택',approach:'장타와 홈런으로 득점 기회를 만드는 타격',growth:['power','contact'],skills:{contact:42,power:56,eye:38,speed:38,defense:42,mental:45}},
    {name:'호타준족형',description:'주력 · 컨택',approach:'빠른 발과 타격을 살려 추가 진루를 노리는 야구',growth:['speed','contact'],skills:{contact:45,power:42,eye:42,speed:56,defense:48,mental:42}},
    {name:'출루형',description:'선구안 · 정신력',approach:'볼넷을 골라 출루하고 타석의 흐름을 읽는 타격',growth:['eye','mental'],skills:{contact:47,power:35,eye:60,speed:40,defense:38,mental:50}},
    {name:'수비형',description:'수비 · 주력',approach:'넓은 수비 범위와 안정적인 포구로 실점을 막는 야구',growth:['defense','speed'],skills:{contact:46,power:35,eye:40,speed:58,defense:62,mental:50}},
    {name:'올라운더',description:'컨택 · 파워',approach:'타격의 정확성과 장타력을 함께 키우는 균형형',growth:['contact','power'],skills:{contact:45,power:45,eye:45,speed:45,defense:45,mental:45}},
  ],
  PITCHER:[
    {name:'파워피처',description:'구속 · 변화구',approach:'빠른 공과 슬라이더 조합으로 헛스윙을 노리는 투구',growth:['velocity','breaking'],skills:{velocity:54,control:40,breaking:42,stamina:45,mental:42}},
    {name:'제구형',description:'제구 · 정신력',approach:'코너를 공략하고 볼넷을 줄이는 정교한 투구',growth:['control','mental'],skills:{velocity:38,control:54,breaking:44,stamina:42,mental:45}},
    {name:'변화구형',description:'변화구 · 제구',approach:'슬라이더·커브의 움직임으로 타이밍을 빼앗는 투구',growth:['breaking','control'],skills:{velocity:43,control:40,breaking:54,stamina:44,mental:42}},
    {name:'땅볼 유도형',description:'제구 · 변화구',approach:'싱커와 낮은 코스 공략을 중심으로 하는 투구',growth:['control','breaking'],skills:{velocity:35,control:54,breaking:50,stamina:38,mental:42}},
    {name:'완급 조절형',description:'변화구 · 정신력',approach:'빠른 공과 체인지업의 속도 차를 활용하는 투구',growth:['breaking','mental'],skills:{velocity:38,control:44,breaking:54,stamina:44,mental:50}},
    {name:'이닝이터',description:'체력 · 제구',approach:'긴 이닝을 버틸 체력과 안정적인 제구를 키우는 투구',growth:['stamina','control'],skills:{velocity:41,control:44,breaking:38,stamina:65,mental:48}},
  ],
};
export const playStyle=(role:Role,index=0)=>PLAYER_STYLES[role][index]??PLAYER_STYLES[role][0];
export function styleRedistribution(skills:Skills,role:Role,index:number):Skills {
  const style=playStyle(role,index),next={...skills},targets=style.growth;
  const donors=Object.keys(skills).filter(k=>!targets.includes(k)).sort((a,b)=>(skills[b]-style.skills[b])-(skills[a]-style.skills[a])||a.localeCompare(b));
  const taken:Record<string,number>={};
  for(const [key,wanted] of [[targets[0],3],[targets[1],2]] as const)for(let i=0;i<wanted&&next[key]<99;i++){
    const donor=donors.find(k=>next[k]>1&&(taken[k]??0)<2);if(!donor)break;
    next[donor]--;next[key]++;taken[donor]=(taken[donor]??0)+1;
  }
  return next;
}
