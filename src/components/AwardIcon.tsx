export function awardLabel(title: string) {
  const positions: Record<string, string> = {P:'투수', C:'포수', '1B':'1루수', '2B':'2루수', '3B':'3루수', SS:'유격수', OF:'외야수', DH:'지명타자'};
  if (title.startsWith('골든글러브 ')) return `골든글러브 · ${positions[title.split(' ')[1]] ?? title.slice(6)}`;
  return title;
}

export default function AwardIcon({title}: {title: string}) {
  const glove = title.includes('골든글러브'), series = title === '한국시리즈 MVP';
  const trophy = title === '시즌 MVP' || title.includes('우승');
  const batting = /타격왕|홈런왕|타점왕/.test(title);
  const pitching = /평균자책|탈삼진왕|다승왕/.test(title);
  return <svg className="awardIcon" viewBox="0 0 160 190" role="img" aria-label={`${awardLabel(title)} 아이콘`}>
    <defs><linearGradient id={series ? 'seriesSilver' : 'awardGold'}><stop stopColor={series ? '#4a6680' : '#8b581f'}/><stop offset=".3" stopColor={series ? '#f2f6ff' : '#fff0b5'}/><stop offset=".6" stopColor={series ? '#a9c5de' : '#e4ad4c'}/><stop offset="1" stopColor={series ? '#526b89' : '#9a601d'}/></linearGradient></defs>
    {glove ? <g fill="url(#awardGold)" stroke="#70451e" strokeWidth="3"><path d="M42 114C20 94 23 70 36 72L52 89 44 40Q43 26 53 27Q62 27 65 64L63 22Q65 7 75 15L82 64 85 20Q89 6 98 18L99 68 108 33Q115 21 122 32L117 86Q135 62 143 75Q147 85 136 105L112 135 63 138Z"/><path d="M62 107Q67 75 97 82Q117 87 114 113M66 124L107 122" fill="none"/></g>
    : trophy ? <g fill="url(#awardGold)" stroke="#70451e" strokeWidth="3"><path d="M45 38H18Q12 93 56 97L60 84Q30 79 31 51H46M115 38H142Q148 93 104 97L100 84Q130 79 129 51H114"/><path d="M43 25H117L110 82Q106 108 88 114V137H108V151H52V137H72V114Q54 108 50 82Z"/><path d="M80 42L86 57 103 58 90 69 94 86 80 77 66 86 70 69 57 58 74 57Z" fill="#fff0b5" stroke="none"/></g>
    : <g><path d="M49 12H73L91 58 67 67ZM87 12H111L94 66 71 58Z" fill={series ? '#547cb4' : batting ? '#a34d47' : pitching ? '#398a7c' : '#725799'}/><path d="M80 48L132 95 80 148 28 95Z" fill={series ? 'url(#seriesSilver)' : 'url(#awardGold)'} stroke={series ? '#6586a6' : '#88602b'} strokeWidth="3"/>
      {series ? <><path d="M80 64L109 95 80 125 51 95Z" fill="#1c324c"/><path d="M80 76L85 88 98 89 88 98 91 111 80 104 69 111 72 98 62 89 75 88Z" fill="#e2efff"/></>
      : batting ? <><path d="M58 117L98 72Q108 64 110 74L72 124Z" fill="#795027" stroke="#fff0b5" strokeWidth="3"/>{title==='타격왕'?<circle cx="56" cy="83" r="12" fill="#fff0d6"/>:title==='홈런왕'?<path d="M56 65L61 77 74 78 64 87 67 100 56 93 45 100 48 87 38 78 51 77Z" fill="#fff0d6"/>:<path d="M55 68L70 83 55 98 40 83ZM47 82L55 90 76 69" fill="none" stroke="#fff0d6" strokeWidth="4"/>}</>
      : pitching ? <><circle cx="80" cy="96" r="25" fill="#fff6dc"/><path d="M67 74Q88 95 66 117M93 74Q72 95 94 117" fill="none" stroke="#a45040" strokeWidth="3"/>{title==='탈삼진왕'&&<path d="M50 64L41 56M111 64L119 56" stroke="#fff0b5" strokeWidth="5"/>}{title==='다승왕'&&<path d="M70 95L77 103 92 86" fill="none" stroke="#236959" strokeWidth="4"/>}{title.includes('평균자책')&&<circle cx="80" cy="96" r="9" fill="none" stroke="#236959" strokeWidth="3"/>}</>
      : <path d="M80 71L87 88 105 89 91 101 95 120 80 110 65 120 69 101 55 89 73 88Z" fill="#fff1c4"/>}</g>}
    {(glove || trophy) && <><path d="M52 144H108L118 161H42Z" fill="url(#awardGold)"/><rect x="30" y="161" width="100" height="22" rx="4" fill="#142137" stroke="#bc8a43"/><path d="M55 171H105" stroke="#eac47a" strokeWidth="3"/></>}
  </svg>;
}

export function AwardBadge({title}: {title: string}) {
  return <span className="awardBadge"><AwardIcon title={title}/><span>{awardLabel(title)}</span></span>;
}
