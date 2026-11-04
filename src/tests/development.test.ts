import { expect, it } from 'vitest';
import { createCareer } from '../engine/career';
import { developPlayer, selectFocus, focusSkill } from '../engine/development';
import { nextSeason } from '../engine/season';
import { Rng } from '../engine/rng';
it('집중 육성은 수비도 선택하고 시즌 시작 후 변경하지 못한다', () => {
  const save = createCareer({ name: '육성', role: 'HITTER', teamId: 'lg', hand: 'RIGHT', focus: 'defense' }, 1);
  expect(focusSkill(save)).toBe('defense');
  const changed = selectFocus(save, 'speed'); expect(focusSkill(changed)).toBe('speed');
  expect(selectFocus(save, 'velocity')).toBe(save);
  const running = { ...changed, phase: 'SIMULATING' as const };
  expect(selectFocus(running, 'power')).toBe(running);
});
it('동일 난수에서 집중 능력치에 보너스가 적용되고 결산 재처리는 중복 성장하지 않는다', () => {
  const save = createCareer({ name: '육성', role: 'HITTER', teamId: 'lg', hand: 'RIGHT' }, 1);
  save.player.potential = 99;
  const contact = selectFocus(structuredClone(save), 'contact');
  const defense = selectFocus(structuredClone(save), 'defense');
  developPlayer(contact, new Rng(42)); developPlayer(defense, new Rng(42));
  expect(defense.player.skills.defense).toBe(contact.player.skills.defense + 1);
  expect(contact.player.skills.contact).toBe(defense.player.skills.contact + 1);
  const before = structuredClone(defense);
  developPlayer(defense, new Rng(99)); expect(defense).toEqual(before);
  defense.phase = 'SEASON_RESULT';
  expect(nextSeason(defense).player.skills).toEqual(defense.player.skills);
});
it('선택과 보고서가 없는 이전 저장도 기본 육성 및 다음 시즌 진행을 지원한다', () => {
  const save = createCareer({ name: '이전', role: 'PITCHER', teamId: 'lg', hand: 'RIGHT' }, 1);
  delete save.focusSkill; expect(focusSkill(save)).toBe('control');
  save.phase = 'SEASON_RESULT';
  const next = nextSeason(save); expect(next.year).toBe(save.year + 1);
  expect(Object.values(next.player.skills).every(value => value >= 1 && value <= 99)).toBe(true);
});
