'use client';
import { useState } from 'react';
import { SCHOOLS } from '../engine/schools';
export default function SchoolPicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [region, setRegion] = useState(''); const [query, setQuery] = useState('');
  const schools = SCHOOLS.filter(s => (!region || s.region === region) && s.name.toLowerCase().includes(query.toLowerCase().trim()));
  const selected = SCHOOLS.find(s => s.id === value)!;
  return <fieldset className="schoolPicker"><legend>나의 고교 / U18 야구부</legend>
    <div className="fields"><label>지역<select value={region} onChange={e => setRegion(e.target.value)}><option value="">전국</option>{[...new Set(SCHOOLS.map(s => s.region))].sort().map(r => <option key={r}>{r}</option>)}</select></label><label>학교·클럽 검색<input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="예: 덕수, 경남, 광주" /></label></div>
    <p className="footnote">협회 등록 104팀 · 검색 결과 {schools.length}팀 · 현재 선택: <strong>{selected.name}</strong> ({selected.region})</p>
    <div className="schoolOptions" role="group" aria-label="학교·U18 클럽 선택">{schools.map(s => <button key={s.id} type="button" aria-pressed={value === s.id} onClick={() => onChange(s.id)}><strong>{s.name}</strong><span>{s.region} · {s.type === 'SCHOOL' ? '고교 야구부' : 'U18 야구팀'}</span></button>)}</div>
    {!schools.length && <p role="status">검색 결과가 없습니다. 학교 이름이나 지역을 바꿔보세요.</p>}
  </fieldset>;
}
