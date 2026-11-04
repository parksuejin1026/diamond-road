import { expect, it } from 'vitest';
import { SCHOOLS, createSchoolSchedule } from '../engine/schools';
import { createCareer } from '../engine/career';
import { advanceRound, nextSeason } from '../engine/season';
import { signDraft } from '../engine/youth';
import { PLAYER_STYLES } from '../engine/roster';
import { overall } from '../domain/calculators';
import type { CareerSave } from '../engine/career';
it('2026 협회 등록 104개 팀 모두 선택 가능하고 각 팀에 14경기를 편성한다', () => {
  expect(SCHOOLS).toHaveLength(104); expect(new Set(SCHOOLS.map(s => s.id)).size).toBe(104);
  const schedule = createSchoolSchedule(7); expect(schedule).toHaveLength(728);
  for (const school of SCHOOLS) {
    expect(schedule.filter(g => g.homeTeamId === school.id)).toHaveLength(7);
    expect(schedule.filter(g => g.awayTeamId === school.id)).toHaveLength(7);
  }
  for (let r = 1; r <= 14; r++) { const games = schedule.filter(g => g.round === r); expect(games).toHaveLength(52); expect(new Set(games.flatMap(g => [g.homeTeamId, g.awayTeamId])).size).toBe(104); }
});
it('각 역할의 3개 플레이 스타일은 같은 OVR 45로 시작한다', () => {
  for (const role of ['HITTER', 'PITCHER'] as const) for (let style = 0; style < PLAYER_STYLES[role].length; style++) {
    const save = createCareer({ name: '학생', role, schoolId: SCHOOLS[0].id, teamId: 'lg', style, hand: 'RIGHT' }, 1);
    expect(overall(save.player)).toBe(45); expect(save.player.age).toBe(16); expect(save.player.rosterStatus).toBe('BENCH'); expect(save.player.salaryCR).toBe(0);
  }
});
function finish(save: CareerSave) { while (save.phase !== 'SEASON_RESULT') save = advanceRound(save, { interactive: false, autoChoices: true }); return save; }
it.each(['HITTER', 'PITCHER'] as const)('%s 고교 3년·전국대회·드래프트·KBO 첫 시즌을 완주한다', role => {
  let save = createCareer({ name: '고교 선수', role, schoolId: SCHOOLS.find(s => s.name === '덕수고')!.id, teamId: 'lg', hand: 'RIGHT', style: 0 }, 29);
  const origin = save.player.teamId;
  for (let grade = 1; grade <= 3; grade++) {
    save = finish(save);
    expect(save.youth?.history).toHaveLength(grade); expect(save.seasons).toHaveLength(0);
    expect(save.league.results).toHaveLength(728);
    expect(save.youth?.cups).toHaveLength(4);
    for (const cup of save.youth!.cups!) { expect(SCHOOLS.some(s => s.id === cup.champion)).toBe(true); expect(cup.games.length).toBeGreaterThanOrEqual(103); }
    const before = save; save = nextSeason(save);
    if (grade < 3) { expect(save.player.age).toBe(16 + grade); expect(save.youth?.grade).toBe(grade + 1); expect(save.player.teamId).toBe(origin); }
    else { expect(save.phase).toBe('DRAFT'); expect(nextSeason(save)).toBe(save); expect(before.youth?.draft).toBeTruthy(); }
  }
  save = signDraft(save); expect(save.player.age).toBe(19); expect(save.year).toBe(2029); expect(save.youth?.graduated).toBe(true);
  expect(save.players).toHaveLength(180); expect(save.league.standings).toHaveLength(10); expect(save.schedule).toHaveLength(720);
  expect(signDraft(save)).toBe(save); expect(save.youth?.history).toHaveLength(3);
  save = finish(save); expect(save.seasons).toHaveLength(1); expect(save.league.results).toHaveLength(720);
}, 90000);
