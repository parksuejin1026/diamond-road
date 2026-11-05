'use client';
import { useState } from 'react';
import { TEAMS } from '../engine/schedule';
export default function TeamMark({id,size=32}:{id:string;size?:number}){
  const [failed,setFailed]=useState(false),team=TEAMS.find(t=>t.id===id);
  if(!team)return null;
  return <span className="teamMark" style={{width:size,height:size,backgroundColor:failed?team.color:undefined}}>{failed?<b>{team.id.slice(0,2).toUpperCase()}</b>:<img src={`${process.env.NEXT_PUBLIC_BASE_PATH??''}/teams/${id}.png`} width={size} height={size} alt={`${team.name} 마크`} onError={()=>setFailed(true)}/>}</span>;
}
