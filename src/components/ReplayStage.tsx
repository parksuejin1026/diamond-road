'use client';
import {useEffect,useRef,useState} from 'react';
import {drawActor,loadClip,loadImage} from '../game/replay/assets';
import {REPLAY_DURATION,sampleReplay,type Clip,type ReplayKind} from '../game/replay/timeline';

export default function ReplayStage({kind,paused=false,speed=1,loop=true,title,playerName}:{kind:ReplayKind;paused?:boolean;speed?:number;loop?:boolean;title:string;playerName:string}){
  const canvas=useRef<HTMLCanvasElement>(null),host=useRef<HTMLDivElement>(null);
  const playback=useRef({paused,speed});playback.current={paused,speed};
  const [status,setStatus]=useState<'loading'|'ready'|'error'>('loading');
  const [phase,setPhase]=useState('경기 장면을 준비합니다'),[impact,setImpact]=useState(false),[progress,setProgress]=useState(0);
  useEffect(()=>{
    let disposed=false,raf=0,visible=true,time=0,last=0,lastUi=-1;
    const observer=new IntersectionObserver(entries=>{visible=entries[0]?.isIntersecting??true;last=0;},{threshold:.12});
    if(host.current)observer.observe(host.current);
    const clips:Clip[]=['bat','pitch','catch','run'];
    const background=kind==='STRIKEOUT'?'pitcher-stadium-v4.png':kind==='CATCH'||kind==='RUN'?'outfield-stadium-v4.png':'stadium-v4.png';
    Promise.all([loadImage(background),...clips.map(loadClip)]).then(([stadium,...sheets])=>{
      if(disposed)return;setStatus('ready');
      const art=Object.fromEntries(clips.map((c,i)=>[c,sheets[i]])) as Record<Clip,HTMLImageElement>;
      const ctx=canvas.current?.getContext('2d');if(!ctx)return;
      ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
      function draw(stamp:number){
        if(disposed||!ctx||!canvas.current)return;
        const dt=last?Math.min(.08,(stamp-last)/1000):0;last=stamp;
        if(visible&&!document.hidden&&!playback.current.paused)time+=dt*playback.current.speed;
        if(loop&&time>REPLAY_DURATION+1.15)time=0;
        const sample=sampleReplay(kind,time),t=sample.time;
        ctx.clearRect(0,0,1280,720);ctx.save();
        const zoom=kind==='HOME_RUN'&&t>2.08?1+Math.min(.035,(t-2.08)*.025):1;
        ctx.translate(640,360);ctx.scale(zoom,zoom);ctx.translate(-640,-360);
        ctx.drawImage(stadium,0,0,1280,720);
        if(sample.opponent)drawActor(ctx,art[sample.opponent.clip],sample.opponent);
        drawActor(ctx,art[sample.hero.clip],sample.hero);
        if(sample.ball){
          const {x,y,r}=sample.ball;
          ctx.save();ctx.shadowColor='#fff4cc';ctx.shadowBlur=12;ctx.fillStyle='#fffdf1';ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();ctx.restore();
          ctx.strokeStyle='#9b3b39';ctx.lineWidth=1.4;ctx.beginPath();ctx.arc(x,y,r*.65,-1,1);ctx.stroke();
          if(kind==='HOME_RUN'&&t>=2.08){ctx.strokeStyle='rgba(255,224,153,.55)';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x-55,y+38);ctx.lineTo(x-14,y+9);ctx.stroke();}
        }
        if(sample.contact){
          const p=(t-2.08)/.16;ctx.save();ctx.translate(472,390);ctx.strokeStyle=`rgba(255,231,167,${1-p})`;ctx.lineWidth=4;
          for(let i=0;i<8;i++){const a=i*Math.PI/4;ctx.beginPath();ctx.moveTo(Math.cos(a)*9,Math.sin(a)*9);ctx.lineTo(Math.cos(a)*(24+p*40),Math.sin(a)*(24+p*40));ctx.stroke();}ctx.restore();
        }
        if(sample.land){ctx.fillStyle=`rgba(204,167,111,${(3.05-t)*.6})`;ctx.beginPath();ctx.ellipse(sample.hero.x+25,619,90+(t-2.65)*70,13,0,0,Math.PI*2);ctx.fill();}
        if(kind==='CHAMPION'){
          for(let i=0;i<42;i++){const y=(i*83+t*(70+i%5*18))%850-90,x=(i*139+Math.sin(t+i)*38)%1280;ctx.save();ctx.translate(x,y);ctx.rotate(t+i);ctx.fillStyle=['#edb95d','#f1ead6','#4bb6a2'][i%3];ctx.fillRect(-3,-6,6,12);ctx.restore();}
        }
        ctx.restore();
        const shade=ctx.createLinearGradient(0,0,0,720);shade.addColorStop(0,'rgba(2,10,22,.48)');shade.addColorStop(.35,'rgba(2,10,22,0)');shade.addColorStop(.8,'rgba(2,10,22,0)');shade.addColorStop(1,'rgba(2,10,22,.45)');ctx.fillStyle=shade;ctx.fillRect(0,0,1280,720);
        canvas.current.dataset.heroFrame=String(sample.hero.frame);canvas.current.dataset.heroClip=sample.hero.clip;canvas.current.dataset.replayTime=t.toFixed(2);
        if(stamp-lastUi>90){setPhase(sample.phase);setImpact(sample.impact);setProgress(Math.min(1,time/REPLAY_DURATION));lastUi=stamp;}
        raf=requestAnimationFrame(draw);
      }
      raf=requestAnimationFrame(draw);
    }).catch(()=>{if(!disposed)setStatus('error');});
    return()=>{disposed=true;cancelAnimationFrame(raf);observer.disconnect();};
  },[kind,loop]);
  return <div ref={host} className={`replayStage replay-${kind.toLowerCase()}`} data-status={status}>
    <canvas ref={canvas} width={1280} height={720} role="img" aria-label={`${playerName}의 ${title} 경기 애니메이션`} className="replayCanvas"/>
    <div className="replayNameplate"><span>DIAMOND ROAD</span><strong>{playerName}</strong></div>
    {status==='loading'&&<div className="replayLoading" role="status">경기 장면을 불러오는 중…</div>}
    {status==='error'&&<div className="replayLoading" role="alert">그림을 불러오지 못했습니다. 다시 재생해 주세요.</div>}
    <div className={`replayResult ${impact?'visible':''}`} aria-live="off"><small>THE MOMENT</small><strong>{title}</strong></div>
    <div className="replayPhase"><i aria-hidden="true"/>{phase}</div>
    <div className="replayProgress" aria-hidden="true"><i style={{width:`${progress*100}%`}}/></div>
  </div>;
}
