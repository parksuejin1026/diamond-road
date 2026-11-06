import {expect,test} from '@playwright/test';
import {createCareer} from '../src/engine/career';
import {installSave,readSave} from './helpers';
import {styleRedistribution} from '../src/engine/playStyles';
const make=()=>{const s=createCareer({name:'새로운 방향',role:'PITCHER',teamId:'lg',hand:'RIGHT',style:0},25);s.life!.meeting={year:s.year,answered:true};return s;};
test('시즌 중 스타일 제안에서 전후 능력치를 보고 선택하며 결과 확인까지 진행을 멈춘다',async({page})=>{
 const save=make();save.phase='SIMULATING';save.league.round=50;save.life!.turningPoint={year:save.year,round:50,status:'PENDING',kind:'STYLE',style:5};
 await installSave(page,save,true);await expect(page.getByRole('heading',{name:'커리어의 새로운 가능성'})).toBeVisible();await expect(page.getByRole('region',{name:'스타일 전환 능력치 비교'})).toBeVisible();
 await page.screenshot({path:'artifacts/style-turning-point-v5.png',fullPage:true});
 await page.reload();expect((await readSave(page)).life!.turningPoint!.status).toBe('PENDING');
 await page.getByRole('button',{name:'제안 수락 · 이닝이터'}).click();await expect(page.getByRole('heading',{name:'전환점의 선택'})).toBeVisible();
 expect((await readSave(page)).player.skills).toEqual(styleRedistribution(save.player.skills,'PITCHER',5));expect((await readSave(page)).league.round).toBe(50);
 await page.getByRole('button',{name:'확인 · 시즌 이어가기 →'}).click();await expect(page.locator('.bottomTabs')).toBeVisible();
});
test('집중 능력 변경도 이벤트가 있어야 제안하며 유지하면 방향과 능력치를 보존한다',async({page})=>{
 const save=make();save.phase='SIMULATING';save.league.round=45;save.life!.turningPoint={year:save.year,round:45,status:'PENDING',kind:'FOCUS',focus:'stamina'};
 await installSave(page,save,true);await page.getByRole('button',{name:'현재 방향 유지',exact:true}).click();await page.getByRole('button',{name:'확인 · 시즌 이어가기 →'}).click();
 expect((await readSave(page)).focusSkill).toBe(save.focusSkill);expect((await readSave(page)).player.skills).toEqual(save.player.skills);
});
test('은퇴 모달은 포커스를 가두고 Escape 취소 후 기존 버튼으로 돌아온다',async({page})=>{
 await installSave(page,make());await page.getByRole('navigation').getByRole('button',{name:'선수',exact:true}).click();await page.getByText('커리어 관리',{exact:true}).click();await page.getByRole('button',{name:'은퇴하기',exact:true}).click();
 const dialog=page.getByRole('dialog',{name:'선수 생활을 마무리할까요?'});await expect(dialog).toBeVisible();await expect(dialog.getByRole('button',{name:'계속 플레이'})).toBeFocused();
 await page.keyboard.press('Tab');await expect(dialog.getByRole('button',{name:'은퇴 확정 · 커리어 정리'})).toBeFocused();await page.keyboard.press('Tab');await expect(dialog.getByRole('button',{name:'계속 플레이'})).toBeFocused();
 await page.screenshot({path:'artifacts/retirement-confirm-v5.png'});await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);await expect(page.getByRole('button',{name:'은퇴하기',exact:true})).toBeFocused();expect((await readSave(page)).phase).toBe('PRESEASON');
});
test('은퇴 후 별도 회고 화면에서 통산·연대기·수상·계약을 나눠 보고 새 선수는 모달로 확인한다',async({page})=>{
 const save=make();save.phase='SEASON_RESULT';save.player.age=35;save.year=2043;
 save.seasons=[{year:2042,age:34,teamId:'lg',rank:1,ovr:75,hitter:null,pitcher:{...save.league.pitchers.user,g:27,gs:27,outs:510,so:180,er:60,wins:15,losses:7},awards:['시즌 MVP'],championship:true}];
 await page.setViewportSize({width:390,height:844});await installSave(page,save);
 await page.getByRole('button',{name:'이번 시즌을 끝으로 은퇴'}).click();await page.getByRole('dialog').getByRole('button',{name:'은퇴 확정 · 커리어 정리'}).click();await expect(page).toHaveURL(/legacy/);
 await expect(page.locator('.bottomTabs')).toHaveCount(0);await expect(page.getByText('HALL OF FAME',{exact:true})).toBeVisible();await page.screenshot({path:'artifacts/retirement-overview-v5-mobile.png',fullPage:true});
 await page.getByRole('button',{name:'통산 기록',exact:true}).click();await expect(page.getByRole('table')).toBeVisible();await expect(page.getByRole('table')).toContainText('180');
 await page.getByRole('button',{name:'트로피',exact:true}).click();await expect(page.locator('.honorCollection')).toContainText('시즌 MVP');await page.getByRole('button',{name:'구단·계약',exact:true}).click();await expect(page.getByRole('heading',{name:'계약 이력',exact:true})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);await page.getByRole('button',{name:'새로운 야구 인생 시작'}).click();await expect(page.getByRole('dialog')).toBeVisible();await page.getByRole('dialog').getByRole('button',{name:'기록 더 보기'}).click();expect((await readSave(page)).phase).toBe('RETIRED');
 await page.getByRole('button',{name:'새로운 야구 인생 시작'}).click();await page.getByRole('dialog').getByRole('button',{name:'기록 보관 · 새 선수 만들기'}).click();await expect(page.getByRole('textbox',{name:'선수 이름'})).toBeVisible();await page.getByText('은퇴 선수 아카이브 · 1명',{exact:true}).click();await expect(page.getByRole('button',{name:/새로운 방향 · 1시즌/})).toBeVisible();
});
test('시즌 준비와 경기 진행을 분리하고 진행 버튼은 모바일에서도 찾을 수 있다',async({page})=>{
 await page.setViewportSize({width:320,height:740});await installSave(page,make());await expect(page.getByRole('region',{name:'시즌 아이템 상점'})).toBeVisible();await expect(page.getByRole('button',{name:'시즌 전체 자동 진행 →'})).toBeInViewport();
 await page.getByRole('button',{name:'경기 진행',exact:true}).click();await expect(page.getByRole('region',{name:'시즌 아이템 상점'})).toBeHidden();await expect(page.getByRole('button',{name:'시즌 전체 자동 진행 →'})).toBeInViewport();
 await page.getByRole('button',{name:'성장·상점',exact:true}).click();await expect(page.getByRole('region',{name:'시즌 아이템 상점'})).toBeVisible();await expect(page.getByRole('button',{name:'시즌 전체 자동 진행 →'})).toBeInViewport();await page.getByRole('region',{name:'시즌 아이템 상점'}).getByRole('article').last().scrollIntoViewIfNeeded();await expect(page.getByRole('button',{name:'시즌 전체 자동 진행 →'})).toBeInViewport();expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);await page.screenshot({path:'artifacts/season-preparation-v5-mobile.png',fullPage:true});
 await page.setViewportSize({width:1440,height:900});await expect(page.getByRole('button',{name:'시즌 전체 자동 진행 →'})).toBeInViewport();const menu=await page.getByRole('navigation').boundingBox();expect(menu!.width).toBeLessThan(200);expect(menu!.x).toBeLessThan(300);await page.screenshot({path:'artifacts/season-preparation-v5-desktop.png'});
});
