import {expect,test,type Page} from '@playwright/test';
import {createCareer,type CareerSave} from '../src/engine/career';
import {SCHOOLS,UNIVERSITIES} from '../src/engine/schools';
import {enrollUniversity} from '../src/engine/youth';
import {readSave} from './helpers';
const make=()=>{const save=createCareer({name:'새로운 도전',role:'HITTER',hand:'RIGHT',teamId:'lg',focus:'defense'},41);save.life!.meeting={year:2026,answered:true};return save;};
async function install(page:Page,save:CareerSave){
 await page.goto('./');await page.getByRole('textbox',{name:'선수 이름'}).waitFor();
 await page.evaluate(value=>new Promise<void>((resolve,reject)=>{const open=indexedDB.open('diamond-road',1);open.onupgradeneeded=()=>open.result.createObjectStore('saves');open.onsuccess=()=>{const db=open.result,tx=db.transaction('saves','readwrite');tx.objectStore('saves').put(value,'active');tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);};}),save);
 await page.reload();await expect(page).toHaveURL(/career/);
}
for(const kind of ['RENEWAL','EXTENSION','FA','RELEASE','TRADE'] as const)test(`${kind} 구단 계약은 전용 화면에서 직접 선택`,async({page})=>{
 const save=make();save.phase='SEASON_RESULT';save.player.contractYearsLeft=1;save.contractService={days:1160,faUses:0,lastFADays:0,activeRounds:0};
 const offer={teamId:kind==='RENEWAL'||kind==='EXTENSION'?'lg':'kia',kind,year:2027,years:2,salaryCR:7000,opportunity:'STARTER' as const,signingBonusCR:1000};
 if(kind==='TRADE'){save.pendingTrade=offer;save.player.contractYearsLeft=3;}else save.contractOffers=[offer];
 await install(page,save);await expect(page.getByRole('heading',{level:1})).toContainText(kind==='TRADE'?'트레이드':'계약');await expect(page.locator('.bottomTabs')).toHaveCount(0);await expect(page.getByRole('button',{name:'성장 반영 · 다음 시즌 →'})).toHaveCount(0);
 expect((await readSave(page)).player.salaryCR).toBe(3000);await page.reload();await expect(page.locator('.decisionCard')).toBeVisible();
 if(kind==='RENEWAL'){await page.setViewportSize({width:390,height:844});await page.screenshot({path:'artifacts/contract-dedicated-mobile.png',fullPage:true});}
 if(kind==='TRADE')await page.getByRole('button',{name:'트레이드 수락',exact:true}).click();else await page.locator('.offer').click();
 await expect(page.locator('.bottomTabs')).toBeVisible();expect((await readSave(page)).player.teamId).toBe(offer.teamId);
});
test('세계대회는 자동 실행하지 않고 참가 보류와 결과 확인을 각각 기다린다',async({page})=>{
 const save=make();save.phase='SEASON_RESULT';save.year=2027;save.postseason={champion:'kia',games:[]};await install(page,save);
 await expect(page.getByRole('heading',{level:1})).toHaveText('세계 야구 대회 대표팀 도전');expect((await readSave(page)).world).toBeUndefined();
 await page.getByRole('button',{name:'이번 대회 도전 보류'}).click();await expect(page.getByRole('heading',{level:1})).toHaveText('세계 야구 대회 결과');expect((await readSave(page)).world?.[0].selected).toBe(false);
 await page.reload();await expect(page.getByRole('heading',{level:1})).toHaveText('세계 야구 대회 결과');await page.getByRole('button',{name:'대회 결과 확인 · 다음으로 →'}).click();await expect(page.locator('.bottomTabs')).toBeVisible();
});
for(const kind of ['HOME_RUN','STRIKEOUT','CATCH','CHAMPION'] as const)test(`${kind} 본인 명장면 한 장면이 전용 화면에서 실제 자세를 바꾼다`,async({page})=>{
 const save=make();save.phase='SEASON_RESULT';save.moments=[{id:'other',actorId:'npc',year:2026,kind:'HOME_RUN',name:'다른 선수',inning:9,outs:2,bases:0,before:'1 : 1',after:'1 : 2',walkoff:true,grandSlam:true,stage:'한국시리즈'},{id:'own',actorId:'user',year:2026,kind,name:save.player.name,inning:8,outs:1,bases:1,before:'0 : 0',after:'1 : 0',walkoff:false,grandSlam:false,stage:'한국시리즈'}];
 await install(page,save);await expect(page.locator('.momentScene')).toHaveCount(1);expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(1280);await expect(page.getByText('다른 선수')).toHaveCount(0);await expect(page.locator('.bottomTabs')).toHaveCount(0);
 const target=page.locator(kind==='CHAMPION'?'.momentActor .spriteFigure':'.momentActor .spriteArms');
 const before=await target.evaluate(el=>getComputedStyle(el).transform);await page.waitForTimeout(1500);const after=await target.evaluate(el=>getComputedStyle(el).transform);expect(before).not.toBe(after);
 await page.screenshot({path:`artifacts/moment-${kind.toLowerCase()}.png`});await page.getByRole('button',{name:'명장면 확인 · 다음으로 →'}).click();await expect(page.locator('.bottomTabs')).toBeVisible();
});
test('고교 졸업에서 대학을 고르고 새로고침해도 대학 1학년 커리어를 유지한다',async({page})=>{
 const save=createCareer({name:'대학 진학',role:'HITTER',hand:'RIGHT',teamId:'lg',schoolId:SCHOOLS[0].id},41);save.phase='SEASON_RESULT';save.year=2028;save.youth!.grade=3;save.player.age=18;
 await install(page,save);await expect(page.getByRole('heading',{level:1})).toContainText('고교 졸업');await page.getByRole('combobox',{name:'진학할 대학교'}).selectOption(UNIVERSITIES[1].id);await page.screenshot({path:'artifacts/university-choice.png',fullPage:true});await page.getByRole('button',{name:'선택한 대학교로 진학 →'}).click();
 await expect.poll(async()=>(await readSave(page)).youth?.level).toBe('UNIVERSITY');await page.reload();expect((await readSave(page)).youth?.grade).toBe(1);expect((await readSave(page)).player.age).toBe(19);
});
test('신인 입단도 드래프트 결과와 계약 확인 화면을 분리한다',async({page})=>{
 const save=createCareer({name:'첫 계약',role:'HITTER',hand:'RIGHT',teamId:'lg',schoolId:SCHOOLS[0].id},41);save.phase='DRAFT';save.youth!.grade=3;save.youth!.draft={teamId:'lg',round:2,overallPick:17,score:75,signingBonusCR:20000,salaryCR:3000};
 await install(page,save);await page.getByRole('button',{name:'프로 입단 계약',exact:true}).click();await expect(page.getByRole('heading',{name:'신인 입단 계약',exact:true})).toBeVisible();expect((await readSave(page)).phase).toBe('DRAFT');await page.getByRole('button',{name:'조건 확인 · 입단 계약 체결'}).click();await expect.poll(async()=>(await readSave(page)).phase).toBe('PRESEASON');
});
test('생성 때 집중 능력을 직접 선택하고 시즌 랜덤 변경 결과를 저장한다',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('./');await page.getByRole('textbox',{name:'선수 이름'}).fill('집중 선택');await page.getByRole('button',{name:'다음 단계 →'}).click();await page.getByRole('combobox',{name:'집중 육성 능력치'}).selectOption('defense');await page.getByRole('button',{name:'다음 단계 →'}).click();await page.screenshot({path:'artifacts/appearance-selection-v3.png',fullPage:true});await page.getByRole('button',{name:'나의 커리어 시작하기 →'}).click();await expect(page).toHaveURL(/career/);
 if(await page.getByRole('button',{name:'현재 방향 유지'}).count())await page.getByRole('button',{name:'현재 방향 유지'}).click();
 expect((await readSave(page)).focusSkill).toBe('defense');await page.getByRole('button',{name:'시즌 준비하기 →'}).click();await page.getByRole('button',{name:'집중 능력치 랜덤 변경 · 시즌당 1회'}).click();await expect(page.getByRole('button',{name:'올해 랜덤 변경 완료'})).toBeDisabled();expect((await readSave(page)).focusSkill).not.toBe('defense');
});

test('병역 진로와 결과도 별도의 선택 화면에서 처리한다',async({page})=>{
 const save=make();save.phase='SEASON_RESULT';save.player.age=22;save.requestedDecision='MILITARY';await install(page,save);
 await expect(page.getByRole('heading',{level:1})).toHaveText('병역 진로를 선택하세요');await page.getByRole('button',{name:'일반 복무 선택'}).click();
 await expect(page.getByRole('heading',{level:1})).toHaveText('병역 진행 결과');expect((await readSave(page)).military?.status).toBe('REGULAR');await page.getByRole('button',{name:'병역 결과 확인 · 다음으로 →'}).click();await expect(page.locator('.bottomTabs')).toBeVisible();
});
