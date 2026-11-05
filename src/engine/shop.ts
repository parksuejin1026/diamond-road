import type { CareerSave } from './career';
import type { Role } from '../domain/types';
import { Rng } from './rng';
import { credit, life } from './life';
export interface ShopItem {id:string;name:string;price:number;icon:string;role?:Role;effects:Record<string,number>;description:string;}
export interface ShopState {year:number;stock:string[];purchased:string|null;history:{year:number;id:string;price:number;gains:Record<string,number>}[];}
export const SHOP_ITEMS:ShopItem[]=[
 {id:'grip-tape',name:'논슬립 배트 그립',price:100000,icon:'bat',role:'HITTER',effects:{contact:1},description:'손에 붙는 그립으로 정확한 타격을 돕습니다.'},
 {id:'batting-gloves',name:'프로 배팅 장갑',price:350000,icon:'glove',role:'HITTER',effects:{contact:2},description:'손끝 감각을 살리는 얇은 가죽 장갑.'},
 {id:'maple-bat',name:'메이플 우드 배트',price:900000,icon:'bat',role:'HITTER',effects:{power:3},description:'단단한 나무와 균형 잡힌 무게 중심.'},
 {id:'carbon-bat',name:'커스텀 장타 배트',price:3500000,icon:'bat',role:'HITTER',effects:{power:5},description:'스윙에 맞춰 제작한 나만의 배트.'},
 {id:'training-tee',name:'정밀 배팅 티',price:650000,icon:'tee',role:'HITTER',effects:{contact:2,eye:1},description:'반복하며 타격 기본기를 다집니다.'},
 {id:'sprint-spikes',name:'경량 스프린트 스파이크',price:800000,icon:'shoes',role:'HITTER',effects:{speed:3},description:'베이스를 향한 첫 발을 더 빠르게.'},
 {id:'elite-spikes',name:'맞춤 주루 스파이크',price:4200000,icon:'shoes',role:'HITTER',effects:{speed:5,defense:1},description:'발에 맞춰 설계한 경기용 스파이크.'},
 {id:'fielding-glove',name:'길들인 수비 글러브',price:600000,icon:'glove',role:'HITTER',effects:{defense:3},description:'타구를 안정적으로 품는 깊은 포켓.'},
 {id:'gold-fielding-glove',name:'장인 맞춤 글러브',price:3800000,icon:'glove',role:'HITTER',effects:{defense:5},description:'손 모양에 맞춘 최고급 수비 장비.'},
 {id:'vision-goggles',name:'타구 추적 고글',price:1400000,icon:'goggles',role:'HITTER',effects:{eye:3,defense:1},description:'공을 끝까지 읽는 시야 훈련.'},
 {id:'pitching-target',name:'제구 타깃 네트',price:300000,icon:'target',role:'PITCHER',effects:{control:2},description:'낮은 코너에 공을 모으는 반복 연습.'},
 {id:'precision-target',name:'전자 제구 타깃',price:3200000,icon:'target',role:'PITCHER',effects:{control:5},description:'투구 위치를 즉시 확인하는 장비.'},
 {id:'grip-ball',name:'그립 훈련구',price:100000,icon:'ball',role:'PITCHER',effects:{breaking:1},description:'손가락 감각부터 차근차근.'},
 {id:'spin-ball',name:'회전 분석 훈련구',price:950000,icon:'ball',role:'PITCHER',effects:{breaking:3},description:'회전 축을 확인하며 구종을 다듬습니다.'},
 {id:'elite-spin-ball',name:'고급 구종 분석 키트',price:4500000,icon:'ball',role:'PITCHER',effects:{breaking:5,control:1},description:'구종별 움직임을 세밀하게 분석합니다.'},
 {id:'resistance-band',name:'투구 저항 밴드',price:250000,icon:'band',role:'PITCHER',effects:{velocity:2},description:'투구 동작과 힘의 전달을 연습합니다.'},
 {id:'power-band',name:'프로 투구 트레이너',price:1800000,icon:'band',role:'PITCHER',effects:{velocity:4},description:'폭발적인 투구 동작을 위한 장비.'},
 {id:'pitching-mound',name:'이동식 불펜 마운드',price:6500000,icon:'mound',role:'PITCHER',effects:{control:4,stamina:3},description:'내 페이스로 불펜 세션을 이어 갑니다.'},
 {id:'pitching-cleats',name:'투수 전용 스파이크',price:900000,icon:'shoes',role:'PITCHER',effects:{stamina:2,control:1},description:'흔들림 없는 디딤발을 돕습니다.'},
 {id:'pitching-lab',name:'개인 투구 분석 장비',price:15000000,icon:'monitor',role:'PITCHER',effects:{velocity:4,breaking:4},description:'구속과 구종 완성도를 함께 높입니다.'},
 {id:'game-notebook',name:'야구 기록 노트',price:80000,icon:'notebook',effects:{mental:1},description:'경기마다 배운 것을 내 것으로.'},
 {id:'tactics-book',name:'베테랑의 경기 노트',price:450000,icon:'notebook',effects:{mental:2},description:'승부를 대하는 시야를 넓힙니다.'},
 {id:'smart-watch',name:'스포츠 스마트워치',price:700000,icon:'watch',effects:{mental:2},description:'내 경기 리듬을 파악하는 작은 파트너.'},
 {id:'focus-headset',name:'몰입 훈련 헤드셋',price:2300000,icon:'headset',effects:{mental:4},description:'소음 속에서도 승부에 집중하는 연습.'},
 {id:'elite-analysis',name:'전술 분석 태블릿',price:5500000,icon:'monitor',effects:{mental:5},description:'상대의 습관과 나의 패턴을 읽습니다.'},
 {id:'weighted-ball-set',name:'단계별 웨이트볼',price:1200000,icon:'ball',role:'PITCHER',effects:{stamina:3,velocity:1},description:'단계적으로 몸을 준비하는 훈련구 세트.'},
 {id:'reaction-net',name:'반응 훈련 리바운더',price:1600000,icon:'target',role:'HITTER',effects:{defense:3,speed:1},description:'예측하기 어려운 타구를 따라갑니다.'},
 {id:'indoor-cage',name:'개인 실내 타격 케이지',price:12000000,icon:'cage',role:'HITTER',effects:{contact:4,power:4},description:'날씨와 상관없이 스윙에 몰입합니다.'},
 {id:'catcher-kit',name:'프리미엄 포수 장비',price:2800000,icon:'protector',role:'HITTER',effects:{defense:4,mental:1},description:'수비의 중심에서 안정감을 높입니다.'},
 {id:'home-gym',name:'개인 트레이닝 장비',price:9000000,icon:'dumbbell',effects:{mental:5},description:'흔들리지 않는 프로의 준비를 위한 공간.'},
];
export function shopState(save:CareerSave):ShopState{
 if(save.shop?.year===save.year)return save.shop;
 const rng=new Rng((save.seed^Math.imul(save.year,104729)^0x51a0)>>>0);
 const pool=SHOP_ITEMS.filter(item=>!item.role||item.role===save.player.role);
 for(let i=pool.length-1;i>0;i--){const j=rng.int(0,i);[pool[i],pool[j]]=[pool[j],pool[i]];}
 return {year:save.year,stock:pool.slice(0,3).map(i=>i.id),purchased:null,history:save.shop?.history??[]};
}
export function buyShopItem(original:CareerSave,id:string):CareerSave{
 const current=shopState(original),item=SHOP_ITEMS.find(i=>i.id===id);
 if(original.phase!=='PRESEASON'||current.purchased||!item||!current.stock.includes(id)||life(original).cash<item.price||!Object.keys(item.effects).some(k=>k in original.player.skills&&original.player.skills[k]<99))return original;
 const save=structuredClone(original),state=shopState(save),gains:Record<string,number>={};
 credit(save,`shop-${save.year}`,-item.price,item.name);
 for(const[key,gain]of Object.entries(item.effects)){if(!(key in save.player.skills))continue;gains[key]=Math.min(gain,99-save.player.skills[key]);save.player.skills[key]+=gains[key];}
 save.shop={...state,purchased:id,history:[...state.history,{year:save.year,id,price:item.price,gains}]};
 save.players=save.players.map(p=>p.id===save.player.id?save.player:p);return save;
}
