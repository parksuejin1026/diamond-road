import {expect,test} from '@playwright/test';
for(const name of ['타격','투구','수비','주루','환호'])test(`${name} 미리보기는 실제 그림 프레임을 재생하고 일시정지를 지킨다`,async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('motion-preview/');
  await page.getByRole('group',{name:'동작 선택'}).getByRole('button',{name,exact:true}).click();
  await expect(page.locator('.replayStage')).toHaveAttribute('data-status','ready');
  const frames=await page.locator('.replayCanvas').evaluate(async el=>{
    const canvas=el as HTMLCanvasElement,seen=new Set<string>(),pixels=new Set<number>(),ctx=canvas.getContext('2d')!;
    const start=performance.now();
    while(performance.now()-start<4400){seen.add(`${canvas.dataset.heroClip}:${canvas.dataset.heroFrame}`);const data=ctx.getImageData(100,140,1050,500).data;let sum=0;for(let i=0;i<data.length;i+=211)sum+=data[i];pixels.add(sum);await new Promise(r=>setTimeout(r,65));}
    return {poses:seen.size,paintings:pixels.size};
  });
  expect(frames.poses).toBeGreaterThanOrEqual(name==='환호'?6:7);expect(frames.paintings).toBeGreaterThan(8);
  await page.getByRole('button',{name:'일시정지',exact:true}).click();await page.waitForTimeout(150);
  const time=await page.locator('.replayCanvas').getAttribute('data-replay-time');await page.waitForTimeout(450);expect(await page.locator('.replayCanvas').getAttribute('data-replay-time')).toBe(time);
  expect(errors).toEqual([]);
});
test('모바일에서도 경기 화면과 제어 버튼이 화면 안에 들어온다',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto('motion-preview/');await expect(page.locator('.replayStage')).toHaveAttribute('data-status','ready');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await expect(page.getByRole('button',{name:'느리게 보기'})).toBeVisible();await page.getByRole('button',{name:'느리게 보기'}).click();await expect(page.getByRole('button',{name:'느리게 보기'})).toHaveAttribute('aria-pressed','true');
  await page.screenshot({path:'artifacts/replay-v4-mobile.png',fullPage:true});
});
