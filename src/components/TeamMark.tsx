'use client';
import { useState } from 'react';
import { teamIdentity } from '../engine/institutions';
export default function TeamMark({id,size=32}:{id:string;size?:number}){
  const [failedId,setFailedId]=useState<string|null>(null),team=teamIdentity(id);
  if(!team)return null;
  const fallback=!team.file||failedId===id;
  return <span className={`teamMark${fallback?' nameBadge':''}`} title={`${team.name} ${fallback?'이름 배지':'등록 마크'}`} style={{width:size,height:size,backgroundColor:fallback?team.color:undefined}}>{fallback?<b role="img" aria-label={`${team.name} 이름 배지`}>{[...team.name].slice(0,2).join('')}</b>:<img src={`${process.env.NEXT_PUBLIC_BASE_PATH??''}/${team.file}`} width={size} height={size} alt={`${team.name} 마크`} loading="lazy" decoding="async" onError={()=>setFailedId(id)}/>}</span>;
}
