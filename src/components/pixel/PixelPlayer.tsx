import type { Role } from '../../domain/types';
export default function PixelPlayer({role='HITTER',accent='#f4b950',number=18,className='',variant=0}:{role?:Role;accent?:string;number?:number;className?:string;variant?:number}){
 const skin=['#edba8d','#d59b72','#ac7654','#80513b'][variant%4],hair=['#211b28','#4d3026','#745337'][Math.floor(variant/4)%3];
 return <svg viewBox="0 0 48 72" role="img" aria-label={role==='HITTER'?'배트를 든 도트 야구선수':'글러브를 든 도트 투수'} className={'pixelPlayer '+className} shapeRendering="crispEdges">
 <ellipse cx="25" cy="68" rx="17" ry="3" fill="#050a12" opacity=".6"/>
 <g className="spriteBody">
 <path d="M17 6H31V8H35V12H37V16H36V27H33V31H19V29H16V25H14V15H15V10H17Z" fill="#080d18"/>
 <path d="M17 15H33V26H30V29H20V26H17Z" fill={skin}/>
 <path d="M30 17H34V25H31V28H28V26H30Z" fill="#8b5746" opacity=".55"/>
 <path d="M18 17H22V19H18ZM28 17H32V19H28Z" fill={hair}/><path d="M20 20H22V22H20ZM28 20H30V22H28Z" fill="#131b27"/>
 <path d="M21 20H22V21H21ZM29 20H30V21H29Z" fill="#fff7e7"/><path d="M24 21H26V25H23V24H24Z" fill="#b57960"/><path d="M22 26H28V27H22Z" fill="#794e48"/>
 {variant>=8&&<path d="M18 24H20V26H22V28H28V26H31V24H33V27H31V30H20V28H18Z" fill={hair}/>}
 <path d="M17 7H30V9H34V12H35V16H15V12H17Z" fill={accent}/><path d="M18 8H28V9H18ZM16 12H19V14H16Z" fill="#fff" opacity=".25"/>
 <path d="M15 15H36V17H39V19H26V18H15Z" fill="#111d31"/><path d="M25 9H29V13H25Z" fill="#fff0ce"/><path d="M26 10H28V12H26Z" fill={accent}/>
 <path d="M20 30H30V33H35V36H39V47H35V51H32V55H17V50H12V46H10V37H14V34H20Z" fill="#0b1424"/>
 <path d="M19 33H22V35H28V33H32V36H36V45H33V51H17V46H13V37H17V35H19Z" fill="#eee9d9"/>
 <path d="M16 37H19V45H17V49H20V51H17V46H13V39H16ZM30 35H33V40H35V46H32V51H29Z" fill="#b1b8bc"/>
 <path d="M22 33H24V35H26V33H28V36H26V50H24V36H22Z" fill={accent}/>
 <path d="M26 36H27V48H26" stroke="#fff" strokeWidth=".5"/><path d="M25 38H26V39H25ZM25 42H26V43H25ZM25 46H26V47H25Z" fill="#374155"/>
 <text x="29" y="43" fill="#182b49" fontFamily="monospace" fontWeight="bold" fontSize="6">{number}</text>
 <path d="M18 51H32V54H18Z" fill="#182438"/><path d="M24 51H27V54H24Z" fill="#d8b36c"/>
 <path d="M18 54H32V58H31V65H26V58H24V65H18Z" fill="#e5dfd0"/><path d="M19 55H21V63H19ZM29 55H31V63H29Z" fill="#9daab2"/>
 <path d="M18 62H24V67H16V65H18ZM26 62H32V65H34V67H26Z" fill={accent}/><path d="M16 66H24V68H14V67H16ZM26 66H34V68H26Z" fill="#111827"/><path d="M15 68H18V69H15ZM21 68H23V69H21ZM27 68H29V69H27ZM32 68H34V69H32Z" fill="#c7c9c6"/>
 </g><g className="spriteArms">
 <path d="M11 38H15V44H17V48H13V46H10V41H11ZM35 38H39V43H38V47H34V43H35Z" fill={skin}/>
 <path d="M11 38H15V40H11ZM35 38H39V40H35Z" fill={accent}/>
 {role==='HITTER'?<g className="spriteBat"><path d="M7 10H10V30H12V45H9V31H7Z" fill="#422d2a"/><path d="M8 11H10V28H9V31H8Z" fill="#d1a873"/><path d="M10 34H12V43H10Z" fill="#ded9cd"/><path d="M10 39H15V43H10Z" fill={skin}/></g>:<g className="spriteGlove"><path d="M29 39H38V41H41V48H38V51H30V48H28V42H29Z" fill="#3a2529"/><path d="M30 41H37V43H39V47H36V49H31V47H30Z" fill="#ad7548"/><path d="M32 42H33V47H32ZM35 42H36V47H35ZM31 45H38V46H31Z" fill="#e3af6c"/></g>}
 </g><title>선수 등번호 {number}</title></svg>;
}
