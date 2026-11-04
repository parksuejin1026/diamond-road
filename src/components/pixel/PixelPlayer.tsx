import type { Role } from '../../domain/types';
const PALETTE: Record<string, string> = { o: '#080e1a', h: '#282335', s: '#edba8d', d: '#b97b66', w: '#f1e9d7', g: '#afbdc8', n: '#243b59', b: '#112038', k: '#080f19', a: '#bd8b58', e: '#f4b950' };
// Original 24 × 40 pixel sprite; each occupied cell is one deliberately placed pixel.
const SPRITE = [
  '........................', '.........oooooo.........', '........onnnnnno........', '.......onnnnnnnno.......',
  '.......onnnnnnnnno......', '.......onnnnnnnnnnno....', '.......ohssssssdhoo.....', '.......ossssssssdo......',
  '.......osshsshhssdo.....', '.......ossssssssdo......', '........ossdsssdo.......', '.........osssdo.........',
  '........oowwwwoo........', '......oowwnnnwwwoo......', '.....owwwwnnnwwwwwo.....', '....owwwwwwnwwwwwwwo....',
  '....owwwwwwnwwwwwwwo....', '...owwwwwwwnwwwwwwwwo...', '...owwggwwwnwwwggwwwo...', '...osddowwwnwwwoosddo...',
  '...osddowwwnwwwooosdo...', '....osdowwwnwwwwosdo....', '.....ooowwwnwwwwdoo.....', '.......owwwnwwwwo.......',
  '.......onnnnnnnno.......', '.......onennnnnno.......', '.......owwwowwwwo.......', '.......owwwoowwwo.......',
  '.......owwwoowwwo.......', '.......owgwoowgwo.......', '.......owgwoowgwo.......', '.......onno..onno.......',
  '.......onno..onno.......', '.......onno..onno.......', '.......onno..onno.......', '......okkkko.okkkko.....',
  '.....okkkkkookkkkkko....', '.....ooooooo.ooooooo....', '........................', '........................',
];
export default function PixelPlayer({ role = 'HITTER', accent = '#f4b950', number = 18, className = '' }: { role?: Role; accent?: string; number?: number; className?: string }) {
  const colors: Record<string, string> = { ...PALETTE, n: accent };
  return <svg viewBox="0 0 40 48" role="img" aria-label={role === 'HITTER' ? '배트를 든 도트 야구선수' : '글러브를 든 도트 투수'} className={'pixelPlayer ' + className} shapeRendering="crispEdges">
    <ellipse cx="20" cy="44" rx="13" ry="2" fill="#080e1a" opacity=".45" />
    <g transform="translate(8 4)">{SPRITE.flatMap((row, y) => [...row].map((cell, x) => cell === '.' ? null : <rect key={y * 24 + x} x={x} y={y} width="1" height="1" fill={colors[cell]} />))}
      <rect x="11" y="14" width="1" height="10" fill="#26324c" />
      <rect x="14" y="17" width="3" height="4" fill={accent} /><rect x="15" y="18" width="1" height="2" fill="#fff1c8" />
      {role === 'HITTER' ? <g><path d="M3 22V12H4V5H6V14H5V23Z" fill="#080e1a" /><path d="M4 20V13H5V6H6V13H5V20Z" fill="#c89a6b" /><rect x="3" y="20" width="2" height="4" fill="#ecc29c" /></g> : <g><path d="M15 19H20V20H22V25H20V27H15V25H14V21H15Z" fill="#342331" /><path d="M16 20H19V21H21V24H19V26H16Z" fill="#ad7948" /><path d="M17 21H18V25H17ZM19 22H20V24H19Z" fill="#dfaa65" /></g>}
    </g>
    <title>선수 등번호 {number}</title>
  </svg>;
}
