export type ReplayKind = 'HOME_RUN' | 'STRIKEOUT' | 'CATCH' | 'CHAMPION' | 'RUN';
export type Clip = 'bat' | 'pitch' | 'catch' | 'run';
export interface ActorPose { clip: Clip; frame: number; x: number; floor: number; size: number; flip?: boolean; opponent?: boolean; }
export const REPLAY_DURATION = 5.2;
export const RELEASE_TIME = 1.08;
export const CONTACT_TIME = 2.08;
export const CATCH_TIME = 2.1;
const clamp = (n:number) => Math.max(0,Math.min(1,n));
const at = (time:number,stops:number[]) => Math.max(0,stops.findLastIndex(t=>time>=t));
const batStops = [0,1.2,1.36,1.5,1.68,1.82,1.92,2.02,2.08,2.16,2.26,2.4,2.65,2.95,3.1,3.25];
const pitchStops = [0,.15,.28,.38,.48,.58,.68,.8,.9,1,1.08,1.15,1.28,1.4,1.55,1.7];
export function sampleReplay(kind:ReplayKind,time:number) {
  const t=Math.max(0,Math.min(REPLAY_DURATION,time));
  let hero:ActorPose={clip:'bat',frame:at(t,batStops),x:290,floor:626,size:410};
  let opponent:ActorPose|undefined;
  let ball:{x:number;y:number;r:number}|undefined;
  let phase='투수가 준비합니다',impact=false;
  if(kind==='HOME_RUN') {
    opponent={clip:'pitch',frame:at(t,pitchStops),x:1050,floor:500,size:220,flip:true,opponent:true};
    phase=t<RELEASE_TIME?'투수의 와인드업':t<1.5?'앞발을 들고 타이밍을 잡습니다':t<CONTACT_TIME?'앞발을 내딛고 스윙':t<2.65?'배트 끝에 맞았습니다!':t<3.5?'담장을 넘어갑니다':'1루를 향해 출발합니다';
    if(t>=RELEASE_TIME&&t<CONTACT_TIME) {
      const p=(t-RELEASE_TIME)/(CONTACT_TIME-RELEASE_TIME);
      ball={x:955+(472-955)*p,y:338+52*p-24*Math.sin(Math.PI*p),r:4+3*p};
    } else if(t>=CONTACT_TIME&&t<3.45) {
      const p=(t-CONTACT_TIME)/1.37;
      ball={x:472+670*p,y:390-820*p+350*p*p,r:Math.max(1.5,7-5*p)};
    }
    if(t>=3.5)hero={clip:'run',frame:1+Math.floor((t-3.5)*12)%7,x:290+(t-3.5)*155,floor:626-(t-3.5)*35,size:410-(t-3.5)*48};
    impact=t>=2.85;
  } else if(kind==='STRIKEOUT') {
    hero={clip:'pitch',frame:at(t*.72,pitchStops),x:325,floor:626,size:410};
    // The hitter starts late: the pitch has crossed the plate before the bat arrives.
    const swingTime=Math.max(0,t-1.95)*3.5;
    opponent={clip:'bat',frame:t<1.95?0:Math.min(12,6+Math.floor(swingTime)),x:1035,floor:500,size:220,flip:true,opponent:true};
    const release=RELEASE_TIME/.72,arrival=2.12;
    if(t>=release&&t<arrival+.18){const p=(t-release)/(arrival-release);ball={x:502+436*p,y:332+43*p,r:7-3*clamp(p)};}
    phase=t<.7?'다리를 들어 힘을 모읍니다':t<release?'앞발 착지, 어깨가 열립니다':t<arrival?'손끝에서 공이 떠났습니다':t<2.7?'헛스윙! 포수 미트로':'삼진으로 이닝을 마칩니다';
    impact=t>=2.7;
  } else if(kind==='CATCH') {
    const stops=[0,.2,.4,.58,.76,.95,1.15,1.45,1.75,2.1,2.28,2.45,2.65,2.9,3.2,3.55];
    hero={clip:'catch',frame:at(t,stops),x:280+Math.min(1,t/2.2)*430,floor:616,size:410};
    // Frame 9's closed glove is at (865,311), including the stride offset.
    if(t<CATCH_TIME){const p=t/CATCH_TIME;ball={x:1180-315*p,y:125+186*p*p,r:5};}
    phase=t<.6?'타구 방향을 읽습니다':t<1.45?'공을 향해 전력 질주':t<CATCH_TIME?'몸을 날려 글러브를 뻗습니다':t<2.65?'글러브 안에 잡았습니다':t<3.55?'공을 보호하며 착지':'일어나 공을 들어 보입니다';
    impact=t>=3.55;
  } else if(kind==='CHAMPION') {
    const f=t<.65?9:t<.95?10:t<1.2?11:t<1.5?12:t<1.95?13:t<2.25?14:15;
    hero={clip:'run',frame:f,x:640,floor:640,size:470};phase=t<1.2?'승리의 순간':t<2.25?'온몸으로 기쁨을 터뜨립니다':'우리가 챔피언입니다';impact=t>=2.25;
  } else {
    hero={clip:'run',frame:Math.floor(t*12)%8,x:180+t*185,floor:626-t*8,size:410-t*10};
    phase='1루를 향해 전력 질주';
  }
  return {time:t,hero,opponent,ball,phase,impact,contact:kind==='HOME_RUN'&&t>=CONTACT_TIME&&t<CONTACT_TIME+.16,land:kind==='CATCH'&&t>=2.65&&t<3.05};
}
