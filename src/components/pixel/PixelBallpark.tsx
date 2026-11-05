function diamond(cx: number, cy: number, radius: number) { return `${cx},${cy - radius} ${cx + radius},${cy} ${cx},${cy + radius} ${cx - radius},${cy}`; }
export default function PixelBallpark({ school = false, className = '', children }: { school?: boolean; className?: string; children?: React.ReactNode }) {
  const seats = Array.from({ length: 12 }, (_, row) => Array.from({ length: 68 }, (_, col) => ({ x: 24 + col * 4, y: 47 + row * 3, color: ['#315376', '#203b5a', '#a18d66', '#466783'][(col * 11 + row * 7) % 4] }))).flat();
  const stars = [[23, 12], [79, 22], [111, 8], [207, 16], [263, 8], [289, 24], [171, 6], [45, 31]];
  return <div className={'pixelBallpark ' + className}>
    <svg preserveAspectRatio="xMidYMid slice" viewBox="0 0 320 180" role="img" aria-label={school ? '학교 야구부 운동장 도트 풍경' : '조명 아래 펼쳐진 밤의 야구장 도트 풍경'} shapeRendering="crispEdges">
      <rect width="320" height="180" fill="#0b1220" />
      <rect y="25" width="320" height="55" fill="#111c2e" />
      {!school&&<><path d="M8 24H32L108 141H0ZM284 24H309L320 141H218Z" fill="#f6dda0" opacity=".045"/><path d="M37 32H60V35H37ZM240 30H278V33H240" fill="#2e425d"/>{Array.from({length:16},(_,i)=><g key={`crowd-${i}`}><rect x={38+i*16} y={52+i%3*5} width="2" height="2" fill={i%3?'#d3af8b':'#f4c15e'}/><rect x={37+i*16} y={54+i%3*5} width="4" height="3" fill={i%2?'#a5364a':'#b2c3d2'}/></g>)}</>}
      {stars.map(([x, y]) => <rect key={x} x={x} y={y} width="1" height="1" fill="#b6c6d8" />)}
      <rect x="267" y="12" width="8" height="8" fill="#e6d7ae" /><rect x="265" y="14" width="12" height="4" fill="#e6d7ae" /><rect x="272" y="11" width="5" height="7" fill="#0b1220" />
      {Array.from({ length: 20 }, (_, i) => <g key={i}><rect x={i * 17 - 3} y={36 - i % 4 * 3} width={12 + i % 3} height="36" fill={i % 2 ? '#18283d' : '#152237'} />{[0, 1, 2].map(j => <rect key={j} x={i * 17 + 1} y={40 + j * 7} width="2" height="2" fill={(i + j) % 4 ? '#314157' : '#bc9762'} />)}</g>)}
      <path d="M14 58H306V101H14Z" fill="#192a42" /><path d="M18 55H302V58H18Z" fill="#657588" />
      {seats.map((s, i) => <rect key={i} x={s.x} y={s.y} width="2" height="1" fill={s.color} />)}
      <path d="M18 85H302V99H18Z" fill="#183d45" /><path d="M18 86H302V88H18Z" fill="#d5ad64" />
      {[34,78,218,260].map((x,i)=><g key={`ad-${x}`}><rect x={x} y="90" width="27" height="6" fill={['#274372','#803046','#976e35','#385548'][i]}/><path d={`M${x+3} 92h18m-18 2h12`} stroke="#d8dfdb" strokeWidth="1"/></g>)}
      <path d="M33 100H287L320 180H0Z" fill="#264c42" />
      {[0, 1, 2, 3, 4].map(i => <path key={i} d={`M${33 + i * 50} 100L${55 + i * 48} 100L${85 + i * 62} 180H${44 + i * 62}Z`} fill="#2b5548" />)}
      <path d="M43 109L160 169L277 109L264 100H56Z" fill="#32634e" />
      <path d="M104 125L160 94L216 125L160 169Z" fill="#b68a5d" />
      <path d="M116 125L160 101L204 125L160 155Z" fill="#3b7155" />
      <path d="M160 168L43 109M160 168L277 109" fill="none" stroke="#d6c7a7" strokeWidth="1" />
      <polygon points={diamond(160, 112, 3)} fill="#eee0bd" /><polygon points={diamond(198, 133, 3)} fill="#eee0bd" /><polygon points={diamond(122, 133, 3)} fill="#eee0bd" />
      <path d="M158 161H162V163L160 165L158 163Z" fill="#f3e7cb" /><rect x="155" y="134" width="10" height="3" fill="#c5a878" /><rect x="158" y="133" width="4" height="1" fill="#eee0bd" />
      <path d="M153 163H148V168H153M167 163H172V168H167" stroke="#e3d2ae" fill="none" strokeWidth=".7"/><path d="M77 144H94V153H83ZM228 144H245L239 153H228Z" fill="#182c35"/><path d="M76 143H95M227 143H246" stroke="#9c9276" strokeWidth="2"/>
      <rect x="128" y="54" width="64" height="28" fill="#080e19" /><rect x="131" y="57" width="58" height="22" fill="#142433" />
      <text x="160" y="65" textAnchor="middle" fill="#f4b950" fontSize="5" fontFamily="monospace">DIAMOND ROAD</text>
      <text x="160" y="75" textAnchor="middle" fill="#cee0d1" fontSize="6" fontFamily="monospace">{school ? 'OUR FIRST SEASON' : 'NIGHT AT THE PARK'}</text>
      {[18, 294].map(x => <g key={x}><rect x={x} y="18" width="3" height="73" fill="#7e91a1" /><rect x={x - 10} y="16" width="24" height="9" fill="#263950" />{Array.from({ length: 10 }, (_, i) => <rect key={i} x={x - 8 + i % 5 * 4} y={18 + Math.floor(i / 5) * 4} width="3" height="2" fill="#f4e6b6" />)}</g>)}
      {[[160, 128], [195, 129], [126, 129], [162, 103], [91, 108], [231, 108], [160, 93]].map(([x, y], i) => <g key={i}><rect x={x - 1} y={y - 3} width="3" height="2" fill="#f4b950" /><rect x={x - 1} y={y - 1} width="3" height="4" fill="#ebe7d6" /><rect x={x - 1} y={y + 3} width="1" height="3" fill="#22354d" /><rect x={x + 1} y={y + 3} width="1" height="3" fill="#22354d" /></g>)}
      <path d="M0 173H320V180H0Z" fill="#0b1421" /><path d="M0 173H320V174H0Z" fill="#536478" />
    </svg>{children}
  </div>;
}
