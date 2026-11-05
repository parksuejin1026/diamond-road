import {expect,test} from '@playwright/test';
import {createCareer} from '../src/engine/career';
import {SCHOOLS} from '../src/engine/schools';
import {installSave,readSave,createFromWizard} from './helpers';
test('신규 캐릭터는 이미지 카드로 고르고 지원금·루틴·무료 회복·현금 장부를 표시하지 않는다',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('./');await page.getByRole('textbox',{name:'선수 이름'}).fill('새로운 외형');await page.getByRole('button',{name:'다음 단계 →'}).click();await page.getByRole('button',{name:'다음 단계 →'}).click();
 await expect(page.getByRole('group',{name:'외형 선택'}).getByRole('button')).toHaveCount(6);await expect(page.getByRole('combobox',{name:'외형',exact:true})).toHaveCount(0);await page.getByRole('button',{name:/^외형 5 선택/}).click();await page.screenshot({path:'artifacts/appearance-selection-v2.png'});
 await page.getByRole('button',{name:'나의 커리어 시작하기 →'}).click();await expect(page).toHaveURL(/\/career\/$/);expect((await readSave(page)).life?.cash).toBe(0);expect((await readSave(page)).life?.appearance).toBe(4);await page.getByRole('button',{name:'시즌 준비하기 →'}).click();
 await expect(page.getByRole('region',{name:'시즌 아이템 상점'}).locator('article')).toHaveCount(3);await expect(page.getByText(/첫 커리어 육성 지원금|생활 루틴|무료 회복|현금 입출금|개인 코칭/)).toHaveCount(0);await expect(page.getByRole('button',{name:'시즌 전체 자동 진행 →'})).toBeEnabled();
});
test('드래프트에서 실제 전체 지명 순번·팀 로고·선택 외형·가족 환호를 보여준다',async({page})=>{
 const save=createCareer({name:'지명의 순간',role:'HITTER',schoolId:SCHOOLS[0].id,teamId:'lg',hand:'RIGHT',appearance:3},31);save.phase='DRAFT';save.youth!.grade=3;save.player.age=18;save.youth!.draft={teamId:'lg',round:2,overallPick:17,score:75,signingBonusCR:20000,salaryCR:3000};
 await page.goto('./');await page.evaluate(value=>new Promise<void>((resolve,reject)=>{const open=indexedDB.open('diamond-road',1);open.onupgradeneeded=()=>open.result.createObjectStore('saves');open.onsuccess=()=>{const db=open.result,tx=db.transaction('saves','readwrite');tx.objectStore('saves').put(value,'active');tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);};}),save);await page.reload();
 await expect(page.getByText('2라운드 · 전체 17순위 지명',{exact:true})).toBeVisible();await expect(page.getByRole('region',{name:'신인 드래프트 결과'}).getByRole('img',{name:'LG 트윈스 마크'})).toBeVisible();await expect(page.getByRole('img',{name:'두 손을 들고 함께 기뻐하는 가족'})).toBeVisible();await page.waitForTimeout(1800);await page.screenshot({path:'artifacts/draft-family-reveal.png'});await page.getByRole('button',{name:'연출 건너뛰기'}).click();await page.getByRole('button',{name:'프로 입단 계약',exact:true}).click();expect((await readSave(page)).player.teamId).toBe('lg');
});
test('유스 시즌 총평과 커리어에 우승 및 고교 대회 MVP를 표시한다',async({page})=>{
 const save=createCareer({name:'고교 MVP',role:'HITTER',schoolId:SCHOOLS[0].id,teamId:'lg',hand:'RIGHT'},7);save.phase='SEASON_RESULT';save.youth!.history=[{year:2026,age:16,grade:1,hitter:{...save.league.hitters.user,g:20,ab:80,pa:90,h:30,hr:4,rbi:23},pitcher:null,beforeOvr:45,afterOvr:51,beforeSkills:{...save.player.skills},afterSkills:{...save.player.skills},awards:['황금사자기 우승','황금사자기 대회 MVP'],cups:[{name:'황금사자기',champion:save.player.teamId}]}];
 await installSave(page,save);await expect(page.getByRole('region',{name:'고교 시즌 총평'})).toContainText('황금사자기 대회 MVP');await page.getByRole('navigation').getByRole('button',{name:'기록',exact:true}).click();await page.getByRole('button',{name:'커리어',exact:true}).click();await expect(page.locator('.youthCareerHistory')).toHaveCount(1);await expect(page.locator('.youthCareerHistory')).toContainText('황금사자기 우승');
});
