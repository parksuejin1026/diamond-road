import {expect,test} from '@playwright/test';
test('고교 등록 마크와 대학 50팀 도감을 모바일에서 확인한다',async({page})=>{
 await page.setViewportSize({width:320,height:740});await page.goto('./');
 await page.getByRole('textbox',{name:'선수 이름'}).fill('학교 마크');await page.getByRole('button',{name:'다음 단계 →'}).click();
 await page.getByRole('searchbox',{name:'학교·클럽 검색'}).fill('덕수');
 const mark=page.locator('.schoolOptions').getByRole('img',{name:'덕수고 마크',exact:true});await expect(mark).toBeVisible();await expect.poll(()=>mark.evaluate((img:HTMLImageElement)=>img.naturalWidth)).toBeGreaterThan(0);
 await page.getByText('대학 야구부 마크 도감 · 50팀',{exact:true}).click();await page.getByRole('searchbox',{name:'대학 야구부 검색'}).fill('고려');
 const college=page.getByRole('list',{name:'대학 야구부 마크'}).getByRole('img',{name:'고려대 마크',exact:true});await expect(college).toBeVisible();await expect.poll(()=>college.evaluate((img:HTMLImageElement)=>img.naturalWidth)).toBeGreaterThan(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);await page.screenshot({path:'artifacts/school-university-marks.png'});
});
test('등록 마크 로딩 실패는 이름 배지로 대체하고 다른 학교 선택 시 정상 이미지로 돌아온다',async({page})=>{
 await page.route('**/schools/school-157.jpg',route=>route.abort());await page.goto('./');
 await expect(page.locator('.playerPreview').getByRole('img',{name:'덕수고 이름 배지',exact:true})).toBeVisible();
 await page.getByRole('textbox',{name:'선수 이름'}).fill('다른 학교');await page.getByRole('button',{name:'다음 단계 →'}).click();await page.getByRole('searchbox',{name:'학교·클럽 검색'}).fill('경남고');await page.getByRole('button',{name:/경남고.*고교 야구부/}).click();
 const changed=page.locator('.playerPreview').getByRole('img',{name:'경남고 마크',exact:true});await expect(changed).toBeVisible();await expect.poll(()=>changed.evaluate((img:HTMLImageElement)=>img.naturalWidth)).toBeGreaterThan(0);
});
