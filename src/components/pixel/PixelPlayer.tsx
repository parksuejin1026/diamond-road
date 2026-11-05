import type { Role } from '../../domain/types';
import {appearancePath} from '../../data/appearances';
export default function PixelPlayer({role='HITTER',number=18,className='',variant=0}:{role?:Role;accent?:string;number?:number;className?:string;variant?:number}){
 return <img className={'pixelPlayer playerArtwork '+className} src={appearancePath(variant)} width="256" height="384" alt={role==='HITTER'?'타자 캐릭터':'투수 캐릭터'} title={String(number)} decoding="async"/>;
}
