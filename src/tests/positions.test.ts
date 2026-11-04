import { expect, it, vi } from 'vitest';
import { createCareer } from '../engine/career';
import { applyFielding, pitchingAssignment, selectPosition } from '../engine/positions';
import { advanceRound } from '../engine/season';
import { Rng } from '../engine/rng';
it('포지션을 저장하고 개막 뒤에는 변경하지 않는다', () => {
  const save = createCareer({ name: '우익수', role: 'HITTER', teamId: 'lg', hand: 'RIGHT', position: 'RF' }, 1);
  expect(save.player.position).toBe('RF');
  const next = selectPosition(save, 'SS');
  expect(next.player.position).toBe('SS'); expect(next.players.find(p => p.id === next.player.id)?.position).toBe('SS');
  const running = { ...next, phase: 'SIMULATING' as const };
  expect(selectPosition(running, 'DH')).toBe(running);
  expect(() => createCareer({ name: '투수', role: 'PITCHER', teamId: 'lg', hand: 'RIGHT', position: 'RF' }, 1)).toThrow();
});
it('수비는 인플레이 안타/아웃에 반영하고 지명타자는 제외한다', () => {
  const player = createCareer({ name: '수비', role: 'HITTER', teamId: 'lg', hand: 'RIGHT' }, 1).player;
  const lineup = Array.from({ length: 9 }, () => ({ ...player, skills: { ...player.skills, defense: 95 } }));
  const rng = new Rng(1); vi.spyOn(rng, 'next').mockReturnValue(0);
  expect(applyFielding('SINGLE', lineup, rng)).toBe('BALL_IN_PLAY_OUT');
  for (const fielder of lineup) fielder.skills.defense = 5;
  expect(applyFielding('BALL_IN_PLAY_OUT', lineup, rng)).toBe('SINGLE');
  for (const fielder of lineup.slice(0, 8)) fielder.skills.defense = 50;
  lineup[8].skills.defense = 99;
  expect(applyFielding('SINGLE', lineup, rng)).toBe('SINGLE');
  expect(applyFielding('HOME_RUN', lineup, rng)).toBe('HOME_RUN');
});
it('구원으로 입단하고 능력과 등판 성적을 충족하면 실제 선발 등판한다', () => {
  let save = createCareer({ name: '보직', role: 'PITCHER', teamId: 'lg', hand: 'RIGHT' }, 5);
  expect(save.player.pitchingRole).toBe('RELIEVER'); expect(pitchingAssignment(save)).toBe('RELIEVER');
  for (const key of Object.keys(save.player.skills)) save.player.skills[key] = 80;
  expect(pitchingAssignment(save)).toBe('RELIEVER');
  save.league.pitchers[save.player.id].outs = 18;
  expect(pitchingAssignment(save)).toBe('STARTER');
  for (let i = 0; i < 5; i++) save = advanceRound(save, { interactive: false, events: false });
  expect(save.player.pitchingRole).toBe('STARTER');
  expect(save.league.pitchers[save.player.id].gs).toBeGreaterThan(0);
  save.league.pitchers[save.player.id].outs = 45; save.league.pitchers[save.player.id].er = 20;
  expect(pitchingAssignment(save)).toBe('RELIEVER');
});
it('보직 없는 이전 저장은 기존 선발 배치를 유지한다', () => {
  const save = createCareer({ name: '이전', role: 'PITCHER', teamId: 'lg', hand: 'RIGHT' }, 5);
  delete save.player.pitchingRole;
  expect(pitchingAssignment(save)).toBe('STARTER');
});
