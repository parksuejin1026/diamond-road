import {expect,it} from 'vitest';
import atlas from '../game/replay/atlas.json';
import {CATCH_TIME,CONTACT_TIME,RELEASE_TIME,sampleReplay,type ReplayKind} from '../game/replay/timeline';
it('투수 릴리스 전에는 공이 없고, 타격 시점에 같은 좌표에서 타구로 전환한다',()=>{
  expect(sampleReplay('HOME_RUN',RELEASE_TIME-.01).ball).toBeUndefined();
  const incoming=sampleReplay('HOME_RUN',CONTACT_TIME-.00001).ball!,hit=sampleReplay('HOME_RUN',CONTACT_TIME);
  expect(Math.abs(incoming.x-hit.ball!.x)).toBeLessThan(.01);expect(Math.abs(incoming.y-hit.ball!.y)).toBeLessThan(.01);
  expect(hit.hero.frame).toBe(8);expect(hit.contact).toBe(true);
  expect(sampleReplay('HOME_RUN',CONTACT_TIME+.2).ball!.y).toBeLessThan(hit.ball!.y);
  expect(sampleReplay('HOME_RUN',4).hero.clip).toBe('run');
});
it('다이빙 포구 시점에 공이 글러브로 들어가고 착지·기립 프레임이 이어진다',()=>{
  expect(sampleReplay('CATCH',CATCH_TIME-.01).ball).toBeDefined();
  expect(sampleReplay('CATCH',CATCH_TIME-.00001).ball!.x).toBeCloseTo(865,1);expect(sampleReplay('CATCH',CATCH_TIME-.00001).ball!.y).toBeCloseTo(311,1);
  expect(sampleReplay('CATCH',CATCH_TIME).ball).toBeUndefined();expect(sampleReplay('CATCH',CATCH_TIME).hero.frame).toBe(9);
  expect(sampleReplay('CATCH',2.7).hero.frame).toBe(12);expect(sampleReplay('CATCH',4).hero.frame).toBe(15);
});
it.each(['HOME_RUN','STRIKEOUT','CATCH','CHAMPION','RUN'] as ReplayKind[])('%s는 실제 아틀라스 내의 여러 자세를 재생한다',kind=>{
  const poses=new Set<string>();
  for(let t=0;t<=5.2;t+=.04){const s=sampleReplay(kind,t),f=atlas[s.hero.clip].frames[s.hero.frame];expect(f).toBeDefined();expect(f.w).toBeGreaterThan(0);expect(f.baseline).toBeLessThanOrEqual(f.h);poses.add(`${s.hero.clip}:${s.hero.frame}`);}
  expect(poses.size).toBeGreaterThanOrEqual(kind==='CHAMPION'?7:8);
});
