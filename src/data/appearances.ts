export const APPEARANCES=[
 {id:0,file:'rookie-01.png',description:'검은 머리, 뒤로 쓴 모자와 어깨 위 배트'},
 {id:1,file:'rookie-02.png',description:'갈색 앞머리, 글러브를 가슴에 든 차분한 자세'},
 {id:2,file:'rookie-03.png',description:'짧은 머리, 포수 장비와 활짝 웃는 얼굴'},
 {id:3,file:'rookie-04.png',description:'적갈색 웨이브 머리, 낮게 준비한 수비 자세'},
 {id:4,file:'rookie-05.png',description:'짧은 곱슬머리, 강한 체격과 세워 든 배트'},
 {id:5,file:'rookie-06.png',description:'길게 묶은 검은 머리, 줄무늬 유니폼과 투구 준비 자세'},
] as const;
export function appearancePath(variant=0){return `${process.env.NEXT_PUBLIC_BASE_PATH??''}/art/players/${APPEARANCES[((variant%6)+6)%6].file}`;}
