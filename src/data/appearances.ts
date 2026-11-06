export const APPEARANCES=[
 {id:0,file:'rookie-01.png',description:'승부를 준비하는 기본 자세'},
 {id:1,file:'rookie-02.png',description:'호흡을 가다듬는 집중 자세'},
 {id:2,file:'rookie-03.png',description:'힘을 모으는 역동적인 자세'},
 {id:3,file:'rookie-04.png',description:'공을 끝까지 바라보는 자세'},
 {id:4,file:'rookie-05.png',description:'낮게 중심을 잡는 준비 자세'},
 {id:5,file:'rookie-06.png',description:'주먹을 들어 승리를 기뻐하는 자세'},
] as const;
export function appearancePath(variant=0){return `${process.env.NEXT_PUBLIC_BASE_PATH??''}/art/players/${APPEARANCES[((variant%6)+6)%6].file}`;}
