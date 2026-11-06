import 'fake-indexeddb/auto';
import {expect, it} from 'vitest';
import {createCareer} from '../engine/career';
import {honorKey, pendingHonor, seasonHonors} from '../engine/awardCeremony';
import {acknowledge, pendingDecision} from '../engine/decisions';
import {nextSeason} from '../engine/season';
import {SCHOOLS} from '../engine/schools';
import {loadCareer, saveCareer, deleteCareer} from '../persistence/career';

const make = () => {
  const save = createCareer({name:'시상식', role:'HITTER', teamId:'lg', hand:'RIGHT'}, 25);
  save.phase = 'SEASON_RESULT';
  save.awards = [{title:'골든글러브 DH', playerId:'user'}, {title:'시즌 MVP', playerId:'user'}, {title:'골든글러브 SS', playerId:'other'}];
  return save;
};
it('우승 여부와 별개로 실제 본인 수상만 MVP·골든글러브 순으로 확인한다', () => {
  const save=make(), before=structuredClone(save);
  expect(seasonHonors(save)).toEqual(['시즌 MVP','골든글러브 DH']);
  expect(pendingDecision(save)).toBe('HONOR');
  expect(() => nextSeason(save)).toThrow('이벤트');
  const first=acknowledge(save,honorKey(pendingHonor(save)!));
  expect(pendingHonor(first)).toBe('골든글러브 DH');
  const second=acknowledge(first,honorKey(pendingHonor(first)!));
  expect(pendingHonor(second)).toBeUndefined();
  expect(acknowledge(second,honorKey('시즌 MVP'))).toBe(second);
  expect(second.player).toEqual(save.player);expect(second.awards).toEqual(save.awards);expect(second.league).toEqual(save.league);expect(second.life).toEqual(save.life);
  expect(save).toEqual(before);
});
it('후보·타인 수상·학생 수상·과거 시즌 수상으로는 시상식을 만들지 않는다', () => {
  const save=make();save.awards=[{title:'시즌 MVP 후보',playerId:'user'},{title:'시즌 MVP',playerId:'other'}];
  expect(pendingHonor(save)).toBeUndefined();
  const student=createCareer({name:'학생',role:'HITTER',schoolId:SCHOOLS[0].id,teamId:'lg',hand:'RIGHT'},25);
  student.phase='SEASON_RESULT';student.awards=make().awards;expect(pendingHonor(student)).toBeUndefined();
  save.awards=[];save.seasons=[{year:2025,age:18,teamId:'lg',rank:1,ovr:70,hitter:null,pitcher:null,awards:['시즌 MVP']}];
  expect(pendingHonor(save)).toBeUndefined();
});
it('확정 스냅샷을 우선하며 마지막 시즌 은퇴 때도 수상을 확인할 수 있다', () => {
  const save=make();save.phase='RETIRED';save.seasons=[{year:save.year,age:38,teamId:'lg',rank:5,ovr:70,hitter:null,pitcher:null,awards:['골든글러브 DH'],championship:false}];
  expect(pendingHonor(save)).toBe('골든글러브 DH');
  save.phase='POSTSEASON';expect(pendingHonor(save)).toBeUndefined();
});
it('수상별 확인은 저장 복구 후 보존되고 새 시즌의 동일 상을 숨기지 않는다', async () => {
  await deleteCareer();const save=acknowledge(make(),honorKey('시즌 MVP'));
  await saveCareer(save);const restored=(await loadCareer())!;
  expect(pendingHonor(restored)).toBe('골든글러브 DH');
  await saveCareer(acknowledge(restored,honorKey('골든글러브 DH')));
  expect(pendingHonor((await loadCareer())!)).toBeUndefined();
  const next=structuredClone(save);next.year++;expect(pendingHonor(next)).toBe('시즌 MVP');
});
