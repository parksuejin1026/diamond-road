import universities from '../data/universities.json';
import marks from '../data/school-marks.json';
import { SCHOOLS } from './schools';
import { TEAMS } from './schedule';

export const UNIVERSITIES=universities.teams;
export const UNIVERSITY_SOURCE=universities.source;
const schoolMarks:Record<string,{file:string;name:string}>=marks;
const institutions=new Map([...SCHOOLS,...UNIVERSITIES].map(s=>[s.id,s]));
const colors=['#274b79','#744349','#286355','#75552b','#503f79','#386975'];
export function teamIdentity(id:string){
  const pro=TEAMS.find(t=>t.id===id);
  if(pro)return {name:pro.name,color:pro.color,file:`teams/${id}.png`,official:true};
  const school=institutions.get(id);if(!school)return null;
  const mark=schoolMarks[id];
  const hash=[...id].reduce((n,c)=>n+c.charCodeAt(0),0);
  return {name:school.name,color:colors[hash%colors.length],file:mark?`schools/${mark.file}`:null,official:!!mark};
}
