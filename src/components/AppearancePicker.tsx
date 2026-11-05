import {APPEARANCES,appearancePath} from '../data/appearances';
export default function AppearancePicker({value,onChange,busy=false}:{value:number;onChange:(v:number)=>void;busy?:boolean}){
 return <fieldset className="appearancePicker"><legend>외형</legend><p>직접 보고 마음에 드는 모습을 선택하세요.</p><div className="appearanceGrid" role="group" aria-label="외형 선택">{APPEARANCES.map(a=><button key={a.id} type="button" disabled={busy} aria-label={`외형 ${a.id+1} 선택 · ${a.description}`} aria-pressed={value%6===a.id} onClick={()=>onChange(a.id)}><img src={appearancePath(a.id)} width="160" height="240" alt={a.description} loading={a.id<3?'eager':'lazy'}/><span className="appearanceCheck" aria-hidden="true">{value%6===a.id?'✓':'＋'}</span></button>)}</div></fieldset>;
}
