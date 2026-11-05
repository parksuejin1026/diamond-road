'use client';
import { useState } from 'react';
import { SCHOOLS } from '../engine/schools';
import TeamMark from './TeamMark';
import UniversityMarks from './UniversityMarks';
export default function SchoolPicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [region, setRegion] = useState(''); const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const schools = SCHOOLS.filter(s => (!region || s.region === region) && s.name.toLowerCase().includes(query.toLowerCase().trim()));
  const selected = SCHOOLS.find(s => s.id === value)!;
  return <fieldset className="schoolPicker"><legend>나의 고교 / U18 야구부</legend>
    <div className="fields"><label>지역<select value={region} onChange={e => { setRegion(e.target.value); setPage(0); }}><option value="">전국</option>{[...new Set(SCHOOLS.map(s => s.region))].sort().map(r => <option key={r}>{r}</option>)}</select></label><label>학교·클럽 검색<input type="search" value={query} onChange={e => { setQuery(e.target.value); setPage(0); }} placeholder="예: 덕수, 경남, 광주" /></label></div>
    <p className="footnote">협회 등록 104팀 · 검색 결과 {schools.length}팀 · 현재 선택: <TeamMark id={selected.id}/><strong>{selected.name}</strong> ({selected.region})</p>
    <div className="schoolOptions" role="group" aria-label="학교·U18 클럽 선택">{schools.slice(page * 6, page * 6 + 6).map(s => <button key={s.id} type="button" aria-pressed={value === s.id} onClick={() => onChange(s.id)}><TeamMark id={s.id} size={40}/><strong>{s.name}</strong><span>{s.region} · {s.type === 'SCHOOL' ? '고교 야구부' : 'U18 야구팀'}</span></button>)}</div>
    {schools.length > 6 && <div className="schoolPages"><button type="button" disabled={page === 0} onClick={() => setPage(page - 1)}>이전 학교</button><span>{page + 1} / {Math.ceil(schools.length / 6)}</span><button type="button" disabled={(page + 1) * 6 >= schools.length} onClick={() => setPage(page + 1)}>다음 학교</button></div>}
    {!schools.length && <p role="status">검색 결과가 없습니다. 학교 이름이나 지역을 바꿔보세요.</p>}
    <UniversityMarks/>
  </fieldset>;
}
