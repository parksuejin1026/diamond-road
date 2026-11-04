import { expect, it } from 'vitest';
import { createCareer } from '../engine/career';
import { advanceRound, currentMatch, pendingPaId, resolveHighlight } from '../engine/season';
import { chooseEvent } from '../engine/events';
import { emptyCount, updateCount, resolveHitterPitch, pitchingScatter } from '../engine/miniGame';
import { Rng } from '../engine/rng';
function create(role: 'HITTER' | 'PITCHER') { return createCareer({ name: '직접 플레이', role, hand: 'RIGHT', teamId: 'lg' }, 42); }
it.each(['HITTER', 'PITCHER'] as const)('%s 중요 상황은 실제 출전 중에만 발생하고 타석을 한 번 반영한다', role => {
  let save = create(role); let highlights = 0;
  while (!['SEASON_RESULT', 'RETIRED'].includes(save.phase)) {
    if (save.pendingEvent) { save = chooseEvent(save, save.pendingEvent, 0); continue; }
    if (save.phase === 'HIGHLIGHT_READY') {
      highlights++;
      const match = currentMatch(save.pendingGame!);
      expect(role === 'HITTER' ? match.batterId : match.pitcherId).toBe(save.player.id);
      const id = pendingPaId(save)!;
      const before = save.league.hitters[match.batterId].pa;
      const restored = JSON.parse(JSON.stringify(save));
      const resolved = resolveHighlight(save, id, 'HOME_RUN');
      expect(resolveHighlight(restored, id, 'HOME_RUN')).toEqual(resolved);
      expect(resolved.league.hitters[match.batterId].pa).toBe(before + 1);
      expect(resolveHighlight(resolved, id, 'HOME_RUN')).toBe(resolved);
      expect(resolved.pendingGame!.game.score[match.side === 0 ? 'away' : 'home']).toBeGreaterThan(save.pendingGame!.game.score[match.side === 0 ? 'away' : 'home']);
      save = resolved;
    } else save = advanceRound(save);
  }
  expect(highlights).toBeGreaterThan(0); expect(highlights).toBeLessThanOrEqual(3);
  expect(save.league.results).toHaveLength(720);
}, 30000);
it('자동 건너뛰기는 동일 시드에서 같은 결과를 내며 중복 전달을 무시한다', () => {
  let save = create('HITTER');
  while (save.phase !== 'HIGHLIGHT_READY') save = advanceRound(save);
  const id = pendingPaId(save)!;
  expect(resolveHighlight(save, id)).toEqual(resolveHighlight(JSON.parse(JSON.stringify(save)), id));
  expect(resolveHighlight(save, '다른 타석')).toBe(save);
});
it('4볼·3스트라이크·2스트라이크 파울 규칙', () => {
  let c = emptyCount(); for (let i = 0; i < 4; i++) c = updateCount(c, 'BALL'); expect(c.result).toBe('WALK');
  c = emptyCount(); c = updateCount(updateCount(c, 'STRIKE'), 'STRIKE');
  expect(updateCount(c, 'FOUL').strikes).toBe(2); expect(updateCount(c, 'FOUL').result).toBeNull();
  expect(updateCount(c, 'STRIKE').result).toBe('STRIKEOUT');
});
it('지켜보기는 존 안 스트라이크·존 밖 볼이며 정확한 제구의 오차가 작다', () => {
  const skills = { contact: 50, power: 50, eye: 50, speed: 50, control: 50, velocity: 50, breaking: 50 };
  const pitch = { type: 'FASTBALL' as const, duration: 750, zone: 4, inZone: true };
  expect(resolveHitterPitch(pitch, null, 'NORMAL', skills, skills, new Rng(1))).toBe('STRIKE');
  expect(resolveHitterPitch({ ...pitch, inZone: false }, null, 'NORMAL', skills, skills, new Rng(1))).toBe('BALL');
  for (let i = 1; i < 100; i++) expect(pitchingScatter(99, .3, i / 100)).toBeLessThan(pitchingScatter(30, .3, i / 100));
});
