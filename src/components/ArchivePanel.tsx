'use client';
import { useEffect, useState } from 'react';
import type { CareerSave } from '../engine/career';
import { archivedCareers } from '../persistence/career';
import LegacySummary from './LegacySummary';
export default function ArchivePanel(){
 const [saves,setSaves]=useState<CareerSave[]>([]),[selected,setSelected]=useState<CareerSave|null>(null);
 useEffect(()=>{archivedCareers().then(setSaves).catch(()=>{});},[]);
 if(!saves.length)return null;
 return <details><summary>은퇴 선수 아카이브 · {saves.length}명</summary>{selected?<><button onClick={()=>setSelected(null)}>목록으로 돌아가기</button><LegacySummary archived save={selected} onNewCareer={()=>setSelected(null)}/></>:saves.map(s=><button key={`${s.seed}-${s.player.name}`} onClick={()=>setSelected(s)}>{s.player.name} · {s.seasons.length}시즌</button>)}</details>;
}
