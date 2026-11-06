export const APPEARANCES=[
 {id:0,file:'rookie-01.png',description:'검은 머리와 차분한 표정'},
 {id:1,file:'rookie-02.png',description:'갈색 머리와 밝은 피부'},
 {id:2,file:'rookie-03.png',description:'짧은 머리와 활짝 웃는 얼굴'},
 {id:3,file:'rookie-04.png',description:'적갈색 머리와 긴 옆머리'},
 {id:4,file:'rookie-05.png',description:'짙은 피부와 검은 머리'},
 {id:5,file:'rookie-06.png',description:'길게 묶은 검은 머리'},
] as const;
export function appearancePath(variant=0){return `${process.env.NEXT_PUBLIC_BASE_PATH??''}/art/players/${APPEARANCES[((variant%6)+6)%6].file}`;}
