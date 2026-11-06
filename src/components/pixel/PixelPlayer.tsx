'use client';
import {useEffect,useRef} from 'react';
import type {Role} from '../../domain/types';
import {drawActor,loadClip} from '../../game/replay/assets';
import type {Clip} from '../../game/replay/timeline';

export default function PixelPlayer({role='HITTER',number=18,className='',variant=0,motion='idle'}:{role?:Role;accent?:string;number?:number;className?:string;variant?:number;motion?:'idle'|'bat'|'pitch'|'run'|'catch'|'celebrate'}){
  const canvas=useRef<HTMLCanvasElement>(null);
  useEffect(()=>{
    let disposed=false,timer:ReturnType<typeof setInterval>|undefined;
    const poses:readonly [Clip,number][]=role==='PITCHER'?[['pitch',0],['pitch',2],['pitch',3],['pitch',10],['catch',0],['run',15]]:[['bat',0],['bat',1],['bat',11],['catch',0],['run',9],['run',15]];
    const pose=poses[((variant%6)+6)%6];
    const clip:Clip=motion==='idle'?pose[0]:motion==='celebrate'?'run':motion;
    const start=motion==='idle'?pose[1]:motion==='celebrate'?15:0;
    loadClip(clip).then(image=>{
      if(disposed)return;
      const ctx=canvas.current?.getContext('2d');if(!ctx)return;
      const draw=(frame:number)=>{ctx.clearRect(0,0,384,384);drawActor(ctx,image,{clip,frame,x:192,floor:364,size:342});if(canvas.current)canvas.current.dataset.spriteFrame=String(frame);};
      draw(start);
      if(start===0&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches){let tick=0;timer=setInterval(()=>draw((tick++%4===1)?1:0),650);}
    }).catch(()=>{if(canvas.current)canvas.current.dataset.artError='true';});
    return()=>{disposed=true;if(timer)clearInterval(timer);};
  },[variant,role,motion]);
  return <canvas ref={canvas} className={`pixelPlayer playerArtwork spritePlayer ${className}`} width={384} height={384} role="img" aria-label={role==='HITTER'?'타자 캐릭터':'투수 캐릭터'} title={`등번호 ${number}`} data-appearance={variant%6}/>;
}
