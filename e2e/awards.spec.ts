import {expect, test} from '@playwright/test';
import {createCareer} from '../src/engine/career';
import {installSave, readSave} from './helpers';
const make = () => {
  const save = createCareer({name:'황금빛 야구 인생',role:'HITTER',teamId:'lg',hand:'RIGHT'},25);
  save.phase='SEASON_RESULT';
  save.awards=[{title:'시즌 MVP',playerId:'user'},{title:'골든글러브 DH',playerId:'user'}];
  save.league.hitters.user={...save.league.hitters.user,g:140,pa:600,ab:500,h:180,hr:45,rbi:120};
  return save;
};
for(const width of [320,1440])test(`${width}px 수상 무대는 MVP·골든글러브를 따로 확인하고 저장 복구로 재지급하지 않는다`,async({page})=>{
  await page.setViewportSize({width,height:width===320?740:1000});
  const save=make();await installSave(page,save,true);
  const stage=page.locator('.honorStage');
  await expect(page.getByRole('region',{name:'시즌 MVP 시상식'})).toBeVisible();
  await expect(page.getByRole('button',{name:'수상 확인 · 다음으로 →'})).toBeDisabled();
  await expect(page.getByRole('img',{name:'수상을 기뻐하는 선수'})).toHaveAttribute('data-sprite-frame',/1[0-5]/);
  await page.waitForTimeout(2500);
  await page.screenshot({path:`artifacts/award-mvp-${width}.png`,fullPage:true});
  await page.getByRole('button',{name:'연출 건너뛰기'}).click();
  expect((await readSave(page)).decisions??[]).toEqual(save.decisions??[]);
  await page.reload();await expect(stage).toHaveAttribute('data-finished','false');
  await page.getByRole('button',{name:'연출 건너뛰기'}).click();
  await page.getByRole('button',{name:'수상 확인 · 다음으로 →'}).click();
  await expect(page.getByRole('region',{name:'골든글러브 DH 시상식'})).toBeVisible();
  await expect(stage).toHaveAttribute('data-finished','false');
  await page.reload();await expect(page.getByRole('region',{name:'골든글러브 DH 시상식'})).toBeVisible();
  await page.getByRole('button',{name:'연출 건너뛰기'}).click();
  await page.screenshot({path:`artifacts/award-glove-${width}.png`,fullPage:true});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  await page.getByRole('button',{name:'연출 다시 보기'}).click();await expect(stage).toHaveAttribute('data-finished','false');
  await page.getByRole('button',{name:'연출 건너뛰기'}).click();
  await page.getByRole('button',{name:'수상 확인 · 다음으로 →'}).click();
  await expect(page.locator('.bottomTabs')).toBeVisible();
  const result=await readSave(page);
  expect(result.awards).toEqual(save.awards);expect(result.player.skills).toEqual(save.player.skills);expect(result.life!.cash).toBe(save.life!.cash);
  expect(result.decisions?.filter(key=>key.includes('HONOR:'))).toHaveLength(2);
});
test('모션 줄이기에서는 바로 결과를 읽고 마지막 시즌의 수상 뒤 은퇴 회고로 간다',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  const save=make();save.phase='RETIRED';save.player.age=38;save.awards=save.awards.slice(0,1);
  await installSave(page,save,true);
  await expect(page.getByRole('button',{name:'수상 확인 · 다음으로 →'})).toBeEnabled();
  await expect(page.getByRole('button',{name:'연출 건너뛰기'})).toHaveCount(0);
  expect(await page.locator('.honorTrophy').evaluate(node=>getComputedStyle(node).animationName)).toBe('none');
  await page.getByRole('button',{name:'수상 확인 · 다음으로 →'}).click();
  await expect(page.getByText('HALL OF FAME',{exact:true})).toBeVisible();
  await page.reload();await expect(page.getByText('HALL OF FAME',{exact:true})).toBeVisible();
});

test('연출은 자동으로 끝나며 확인 저장이 실패하면 수상 화면을 유지한다',async({page})=>{
  const save=make();await installSave(page,save,true);
  await expect(page.locator('.honorStage')).toHaveAttribute('data-finished','true',{timeout:8000});
  await expect(page.getByRole('button',{name:'수상 확인 · 다음으로 →'})).toBeEnabled();
  await page.evaluate(()=>{IDBObjectStore.prototype.put=function(){throw new DOMException('Test storage failure','QuotaExceededError');};});
  await page.getByRole('button',{name:'수상 확인 · 다음으로 →'}).click();
  await expect(page.getByRole('alert').filter({hasText:'저장하지 못했습니다'})).toBeVisible();
  await expect(page.getByRole('region',{name:'시즌 MVP 시상식'})).toBeVisible();
  expect((await readSave(page)).decisions??[]).toEqual(save.decisions??[]);
  await page.reload();await expect(page.getByRole('region',{name:'시즌 MVP 시상식'})).toBeVisible();
});

test('상별 아이콘은 시즌·개인 기록·은퇴 트로피에 표시되고 한국시리즈 MVP는 시상식을 열지 않는다',async({page})=>{
  await page.setViewportSize({width:320,height:740});
  const save=make();save.year=2027;save.player.age=35;
  save.awards=[{title:'한국시리즈 MVP',playerId:'user'}];
  save.seasons=[{year:2026,age:34,teamId:'lg',rank:2,ovr:70,hitter:{...save.league.hitters.user},pitcher:null,
    awards:['시즌 MVP','골든글러브 DH','타격왕','홈런왕','타점왕','다승왕','탈삼진왕','평균자책점 1위']},
    {year:2027,age:35,teamId:'lg',rank:1,ovr:72,hitter:{...save.league.hitters.user},pitcher:null,awards:['한국시리즈 MVP'],championship:true}];
  await installSave(page,save);
  await expect(page.locator('.awardCeremony')).toHaveCount(0);
  await expect(page.getByRole('img',{name:'한국시리즈 MVP 아이콘',exact:true})).toBeVisible();
  await page.getByRole('navigation').getByRole('button',{name:'기록',exact:true}).click();
  await page.getByRole('button',{name:'커리어',exact:true}).click();
  await page.getByText('완료 시즌 · 통산 기록 (2시즌)',{exact:true}).click();
  await expect(page.getByRole('img',{name:'골든글러브 · 지명타자 아이콘',exact:true})).toBeVisible();
  await page.getByRole('navigation').getByRole('button',{name:'시즌',exact:true}).click();
  await page.getByRole('button',{name:'이번 시즌을 끝으로 은퇴'}).click();
  await page.getByRole('button',{name:'은퇴 확정 · 커리어 정리'}).click();
  await page.getByRole('button',{name:'트로피',exact:true}).click();
  const collection=page.locator('.honorCollection');
  for(const title of ['시즌 MVP','한국시리즈 MVP','골든글러브 · 지명타자','타격왕','홈런왕','타점왕','다승왕','탈삼진왕','평균자책점 1위']){
    await expect(collection.getByRole('img',{name:`${title} 아이콘`,exact:true})).toBeVisible();
  }
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  await page.screenshot({path:'artifacts/award-icons-mobile.png',fullPage:true});
  await page.setViewportSize({width:1440,height:1000});
  await page.screenshot({path:'artifacts/award-icons-desktop.png',fullPage:true});
});
