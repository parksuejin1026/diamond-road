import atlas from './atlas.json';
import type {ActorPose, Clip} from './timeline';
const images=new Map<string,Promise<HTMLImageElement>>();
export const artPath=(file:string)=>`${process.env.NEXT_PUBLIC_BASE_PATH??''}/art/animation/${file}`;
export function loadImage(file:string):Promise<HTMLImageElement> {
  const url=artPath(file),cached=images.get(url);if(cached)return cached;
  const result=new Promise<HTMLImageElement>((resolve,reject)=>{
    const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>{images.delete(url);reject(new Error('경기 그림을 불러오지 못했습니다. 다시 재생해 주세요.'));};image.src=url;
  });images.set(url,result);return result;
}
export const loadClip=(clip:Clip)=>loadImage(atlas[clip].file);
export function drawActor(ctx:CanvasRenderingContext2D,image:HTMLImageElement,pose:ActorPose){
  const f=atlas[pose.clip].frames[Math.max(0,Math.min(15,pose.frame))];
  const top=pose.floor-f.baseline/f.h*pose.size;
  ctx.save();
  ctx.fillStyle='rgba(4,12,26,.26)';ctx.beginPath();ctx.ellipse(pose.x,pose.floor-2,pose.size*.2,pose.size*.025,0,0,Math.PI*2);ctx.fill();
  ctx.translate(pose.x,0);if(pose.flip)ctx.scale(-1,1);
  if(pose.opponent)ctx.filter='saturate(.55) brightness(.78)';
  ctx.drawImage(image,f.x,f.y,f.w,f.h,-pose.size/2,top,pose.size,pose.size);ctx.restore();
}
