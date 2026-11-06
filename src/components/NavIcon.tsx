export default function NavIcon({kind}:{kind:'home'|'season'|'player'|'records'}){
 const paths={home:'M3 10L12 3L21 10V21H14V14H10V21H3Z',season:'M12 2L22 12L12 22L2 12ZM12 6L18 12L12 18L6 12Z',player:'M16 7A4 4 0 1 1 8 7A4 4 0 1 1 16 7ZM4 22V19C4 15 7 13 12 13S20 15 20 19V22',records:'M4 21V14H8V21ZM10 21V8H14V21ZM16 21V3H20V21Z'};
 return <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={paths[kind]}/></svg>;
}
