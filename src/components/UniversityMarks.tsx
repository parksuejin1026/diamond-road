'use client';
import {useState} from 'react';
import {UNIVERSITIES,UNIVERSITY_SOURCE} from '../engine/institutions';
import TeamMark from './TeamMark';
export default function UniversityMarks(){
 const [query,setQuery]=useState(''),[page,setPage]=useState(0),[open,setOpen]=useState(false);
 const rows=UNIVERSITIES.filter(t=>t.name.includes(query.trim())||t.region.includes(query.trim()));
 return <details className="universityMarks" onToggle={e=>setOpen(e.currentTarget.open)}><summary>대학 야구부 마크 도감 · {UNIVERSITIES.length}팀</summary>{open&&<><label>대학 야구부 검색<input type="search" value={query} onChange={e=>{setQuery(e.target.value);setPage(0);}} placeholder="대학명 또는 지역"/></label><div className="institutionGrid" role="list" aria-label="대학 야구부 마크">{rows.slice(page*6,page*6+6).map(t=><div role="listitem" key={t.id}><TeamMark id={t.id} size={48}/><strong>{t.name}</strong><small>{t.region}</small></div>)}</div>{!rows.length&&<p role="status">검색 결과가 없습니다.</p>}{rows.length>6&&<div className="schoolPages"><button type="button" disabled={page===0} onClick={()=>setPage(page-1)}>이전 대학</button><span>{page+1} / {Math.ceil(rows.length/6)}</span><button type="button" disabled={(page+1)*6>=rows.length} onClick={()=>setPage(page+1)}>다음 대학</button></div>}<p className="footnote"><a href={UNIVERSITY_SOURCE} target="_blank" rel="noreferrer">협회 2026 대학부 등록 팀</a> · 대학 야구부 등록 마크를 표시합니다.</p></>}</details>;
}
