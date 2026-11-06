import {expect,test} from '@playwright/test';
import {createCareer} from '../src/engine/career';
import {installSave,readSave,createFromWizard,dismissDecisions} from './helpers';
test('팀 마크·파비콘이 배포 경로에서 열리고 은퇴 기록이 새 커리어 뒤에도 남는다',async({page,request})=>{
 const icon=await request.get('favicon.svg');expect(icon.status()).toBe(200);
 for(const id of ['lg','doosan','kt','ssg','nc','kia','lotte','samsung','hanwha','kiwoom'])expect((await request.get(`teams/${id}.png`)).status()).toBe(200);
 await createFromWizard(page,'은퇴 보관');page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'은퇴하기',exact:true}).click();
 await expect(page.getByText('당신과 닮은 KBO 은퇴 선수')).toBeVisible();
 page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'새로운 야구 인생 시작'}).click();
 await page.getByText('은퇴 선수 아카이브 · 1명',{exact:true}).click();await expect(page.getByRole('button',{name:/은퇴 보관 · 0시즌/})).toBeVisible();
});
test('실제 저장된 끝내기 연출은 기록 재적용 없이 재생하고 모션 줄이기를 지원한다',async({page})=>{
 const save=createCareer({name:'가을의 주인공',role:'HITTER',teamId:'lg',hand:'RIGHT',appearance:9},9);save.phase='SEASON_RESULT';
 save.moments=[{id:'fixture-walkoff',year:2026,kind:'HOME_RUN',name:save.player.name,inning:9,outs:2,bases:3,before:'6 : 3',after:'6 : 7',walkoff:true,grandSlam:true,stage:'한국시리즈'}];
 await installSave(page,save,true);const before=await readSave(page);
 await page.getByRole('button',{name:'명장면 다시 재생'}).click();await expect(page.locator('.replayResult')).toContainText('끝내기 만루 홈런');
 await page.waitForTimeout(1700);await page.screenshot({path:'artifacts/walkoff-detail.png'});expect((await readSave(page)).league).toEqual(before.league);
 await page.emulateMedia({reducedMotion:'reduce'});await expect(page.getByRole('button',{name:'명장면 재생',exact:true})).toBeVisible();const frame=await page.locator('.replayCanvas').getAttribute('data-replay-time');await page.waitForTimeout(400);expect(await page.locator('.replayCanvas').getAttribute('data-replay-time')).toBe(frame);
});
