import PixelPlayer from './pixel/PixelPlayer';
import {APPEARANCES} from '../data/appearances';
export default function AppearancePicker({value,onChange,busy=false}:{value:number;onChange:(v:number)=>void;busy?:boolean}){
 return <fieldset className="appearancePicker"><legend>선수 카드 포즈</legend><p>내 선수 카드에 담을 모습을 골라 주세요. <a href={`${process.env.NEXT_PUBLIC_BASE_PATH??''}/motion-preview/`} target="_blank" rel="noreferrer">움직임 미리보기 →</a></p><div className="appearanceGrid" role="group" aria-label="외형 선택">{APPEARANCES.map(a=><button key={a.id} type="button" disabled={busy} aria-label={`외형 ${a.id+1} 선택 · ${a.description}`} aria-pressed={value%6===a.id} onClick={()=>onChange(a.id)}><PixelPlayer variant={a.id}/><span className="appearanceCheck" aria-hidden="true">{value%6===a.id?'✓':'＋'}</span></button>)}</div></fieldset>;
}
