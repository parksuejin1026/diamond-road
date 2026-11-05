import { expect, test } from '@playwright/test';
import { createCareer } from '../src/engine/career';
import { createOffers } from '../src/engine/contracts';
import { Rng } from '../src/engine/rng';
import { createFromWizard, installSave, readSave } from './helpers';
test('320px 생성 3단계는 검색·선택·뒤로가기·키보드 입력을 유지한다',async({page})=>{
  await page.setViewportSize({width:320,height:740}); await page.goto('./');
  await page.getByRole('button',{name:'다음 단계 →'}).click();
  await expect(page.getByRole('heading',{name:'선수의 탄생',exact:true})).toBeVisible();
  await page.getByRole('textbox',{name:'선수 이름'}).fill('작은 전설');
  await page.getByRole('textbox',{name:'선수 이름'}).press('Enter');
  expect(await page.getByRole('group',{name:'학교·U18 클럽 선택'}).getByRole('button').count()).toBeLessThanOrEqual(6);
  await page.getByRole('searchbox',{name:'학교·클럽 검색'}).fill('경남고');
  await page.getByRole('button',{name:/경남고.*고교 야구부/}).click();
  await page.getByRole('combobox',{name:'수비 포지션'}).selectOption('RF');
  await page.getByRole('button',{name:/장타자의 꿈/}).click();
  await page.getByRole('button',{name:'← 이전 단계'}).click();
  await expect(page.getByRole('textbox',{name:'선수 이름'})).toHaveValue('작은 전설');
  await page.getByRole('button',{name:'다음 단계 →'}).click();
  await expect(page.getByRole('combobox',{name:'수비 포지션'})).toHaveValue('RF');
  await expect(page.getByRole('button',{name:/장타자의 꿈/})).toHaveAttribute('aria-pressed','true');
  await page.screenshot({path:'artifacts/creation-320.png'});
  await page.getByRole('button',{name:'다음 단계 →'}).click();
  await page.getByRole('button',{name:/^외형 4 선택/}).click();
  await page.getByRole('button',{name:'나의 커리어 시작하기 →'}).click();
  await expect(page).toHaveURL(/\/career\/$/);
  await expect(page.getByText(/16세 · 우익수/)).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);

  const panel=page.locator('main.inCareer>.panel');

  await page.screenshot({path:'artifacts/home-320.png'});
  expect((await readSave(page)).life?.appearance).toBe(3);
  await page.getByRole('button',{name:'시즌 준비하기 →'}).click();

  await page.screenshot({path:'artifacts/preparation-320.png'});
});
test('무료 지급·회복·직접 코칭 없이 세 상품 중 하나를 사며 새로고침 후 유지한다',async({page})=>{
 const save=createCareer({name:'상점 선수',role:'HITTER',teamId:'lg',hand:'RIGHT'},31);save.life!.cash=50000000;
 await installSave(page,save);await expect(page.getByRole('region',{name:'시즌 아이템 상점'}).locator('article')).toHaveCount(3);
 await expect(page.getByRole('combobox',{name:'생활 루틴'})).toHaveCount(0);await expect(page.getByText('현금 입출금 내역',{exact:true})).toHaveCount(0);await expect(page.getByRole('button',{name:/무료 회복/})).toHaveCount(0);
 await page.getByRole('region',{name:'시즌 아이템 상점'}).getByRole('button',{name:'구매하기',exact:true}).first().click();
 const bought=await readSave(page);expect(bought.shop?.history).toHaveLength(1);expect(bought.life!.cash).toBeLessThan(50000000);
 await expect(page.getByRole('button',{name:'구매 완료',exact:true})).toBeDisabled();await page.reload();await page.getByRole('button',{name:'시즌 준비하기 →'}).click();expect((await readSave(page)).shop).toEqual(bought.shop);
 await expect(page.getByRole('button',{name:'시즌 전체 자동 진행 →'})).toBeEnabled();
});

test('방출 선수는 새 구단 입단을 선택해야 다음 시즌으로 간다',async({page})=>{
  const save=createCareer({name:'재도전',role:'HITTER',teamId:'lg',hand:'RIGHT'},1);save.year=2028;save.player.age=25;save.phase='SEASON_RESULT';
  for(const key of Object.keys(save.player.skills))save.player.skills[key]=35;
  save.seasons=[{year:2027,age:24,teamId:'lg',hitter:{...save.league.hitters.user},pitcher:null,rank:10,ovr:35}];
  save.contractOffers=createOffers(save,new Rng(1));await installSave(page,save);
  await expect(page.getByRole('button',{name:'성장 반영 · 다음 시즌 →'})).toBeDisabled();
  await page.getByRole('button',{name:/진로/ ,exact:false}).click();
  await expect(page.getByRole('heading',{name:'방출 · 새로운 소속을 찾아서'})).toBeVisible();await page.locator('.offer').first().click();
  await page.getByRole('button',{name:'성장 반영 · 다음 시즌 →'}).click();expect((await readSave(page)).player.teamId).not.toBe('lg');
});
test('은퇴 저장의 MVP 12회 보상을 복구하고 회고 화면에서 이력을 본다',async({page})=>{
  const save=createCareer({name:'열두 번의 전설',role:'HITTER',teamId:'lg',hand:'RIGHT'},1);save.year=2038;save.player.age=38;save.phase='RETIRED';
  save.seasons=Array.from({length:12},(_,i)=>({year:2026+i,age:26+i,teamId:i<8?'lg':'kia',hitter:{...save.league.hitters.user,h:150,hr:30},pitcher:null,rank:1,ovr:85,awards:['시즌 MVP'],championship:true}));
  await installSave(page,save);await page.getByRole('navigation').getByRole('button',{name:'홈',exact:true}).click();
  await expect(page.getByRole('region',{name:'시즌 MVP 목표'})).toContainText('12 / 12');
  await expect(page.getByText(/다이아몬드의 전설 · 달성/)).toBeVisible();await page.getByRole('button',{name:'연대기',exact:true}).click();
  await expect(page.locator('.legacySummary').getByText(/2026 · LG/)).toBeVisible();await page.screenshot({path:'artifacts/legacy-career.png'});
});
test('트레이드 선택은 진로 화면에서 처리하고 계약 조건을 유지한다',async({page})=>{
  const save=createCareer({name:'새 유니폼',role:'PITCHER',teamId:'lg',hand:'RIGHT'},1);save.phase='SEASON_RESULT';save.player.contractYearsLeft=3;
  save.pendingTrade={teamId:'doosan',year:2027,years:2,salaryCR:save.player.salaryCR,opportunity:'STARTER',kind:'TRADE'};
  await installSave(page,save);await expect(page.getByRole('button',{name:'성장 반영 · 다음 시즌 →'})).toBeDisabled();
  await page.getByRole('button',{name:/^진로/}).click();await page.getByRole('button',{name:'트레이드 수락',exact:true}).click();
  await page.getByRole('button',{name:'성장 반영 · 다음 시즌 →'}).click();
  const next=await readSave(page);expect(next.player.teamId).toBe('doosan');expect(next.player.salaryCR).toBe(save.player.salaryCR);expect(next.player.contractYearsLeft).toBe(2);
});
test('1440px 생성 화면은 선수 미리보기와 입력을 나란히 배치한다',async({page})=>{
  await page.setViewportSize({width:1440,height:900});await page.goto('./');
  await expect(page.getByRole('complementary',{name:'선수 미리보기'})).toBeVisible();
  await page.getByRole('textbox',{name:'선수 이름'}).fill('다이아몬드');
  const preview=await page.locator('.playerPreview').boundingBox(),form=await page.locator('.creationForm').boundingBox();
  expect(preview!.x+preview!.width).toBeLessThan(form!.x);
  await page.screenshot({path:'artifacts/creation-desktop.png'});
});
