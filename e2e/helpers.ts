import {pendingDecision} from '../src/engine/decisions';
import {EVENTS} from '../src/engine/events';
import { expect, type Page } from '@playwright/test';
import type { CareerSave } from '../src/engine/career';
export async function installSave(page: Page, save: CareerSave, preserveDecision=false) {
  await page.goto('./'); await expect(page.getByRole('textbox',{name:'선수 이름'})).toBeVisible();
  await page.evaluate(value=>new Promise<void>((resolve,reject)=>{
    const open=indexedDB.open('diamond-road',1);
    open.onupgradeneeded=()=>open.result.createObjectStore('saves');
    open.onsuccess=()=>{const db=open.result;const tx=db.transaction('saves','readwrite');tx.objectStore('saves').put(value,'active');tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);};
  }),save);
  await page.reload(); await expect(page).toHaveURL(save.phase==='RETIRED'?/\/legacy\/$/:/\/career\/$/);
  if (save.phase === 'RETIRED'||preserveDecision) return;
  await dismissDecisions(page);
  if((await readSave(page)).contractOffers.length||(await readSave(page)).pendingTrade)return;
  await page.getByRole('button',{name:/시즌 준비하기|시즌 이어가기|포스트시즌 확인하기|시즌 결산과 다음 진로|나의 커리어 돌아보기/}).click();
}
export async function readSave(page: Page): Promise<CareerSave> {
  return page.evaluate(()=>new Promise((resolve,reject)=>{
    const open=indexedDB.open('diamond-road',1);
    open.onsuccess=()=>{const db=open.result;const tx=db.transaction('saves');const get=tx.objectStore('saves').get('active');tx.oncomplete=()=>{db.close();resolve(get.result);};tx.onerror=()=>reject(tx.error);};
  }));
}
export async function createFromWizard(page: Page, name: string) {
  await page.goto('./'); await page.getByRole('textbox',{name:'선수 이름'}).fill(name);
  await page.getByRole('button',{name:'다음 단계 →'}).click(); await page.getByRole('button',{name:'다음 단계 →'}).click();
  await page.getByRole('button',{name:'나의 커리어 시작하기 →'}).click(); await expect(page).toHaveURL(/\/career\/$/);
  await dismissDecisions(page);
}

export async function dismissDecisions(page:Page,contracts=false){
 await expect(page).toHaveURL(/\/career\/$/);
 await expect(page.locator('main.inCareer,main.decisionPage,main.draftPage').first()).toBeVisible();
 for(let i=0;i<14;i++){
  const save=await readSave(page),kind=pendingDecision(save);if(!kind||kind==='EDUCATION')return;
  if(kind==='CONTRACT'){
   if(!contracts)return;
   if(save.pendingTrade)await page.getByRole('button',{name:'잔류 요청',exact:true}).click();
   else await page.locator('.offer').first().click();
  }else if(kind==='CAREER_EVENT')await page.getByRole('button',{name:EVENTS.find(e=>e.id===save.pendingEvent)!.choices[0].label,exact:true}).click();
  else if(kind==='TURNING_POINT')await page.getByRole('button',{name:'현재 방향 유지',exact:true}).click();
  else if(kind==='TURNING_RESULT')await page.getByRole('button',{name:'확인 · 시즌 이어가기 →'}).click();
  else if(kind==='MEETING')await page.getByRole('button',{name:'현재 방향 유지'}).click();
  else if(kind==='MOMENT')await page.getByRole('button',{name:'명장면 확인 · 다음으로 →'}).click();
  else if(kind==='ASIAN'||kind==='WORLD')await page.getByRole('button',{name:'대표팀 도전 · 선발 심사'}).click();
  else if(kind==='ASIAN_RESULT'||kind==='WORLD_RESULT')await page.getByRole('button',{name:'대회 결과 확인 · 다음으로 →'}).click();
  else if(kind==='MILITARY_RESULT')await page.getByRole('button',{name:'병역 결과 확인 · 다음으로 →'}).click();
  else return;
  await expect.poll(async()=>JSON.stringify(await readSave(page))).not.toBe(JSON.stringify(save));
 }
 throw new Error('Decision queue did not settle');
}
export async function enterSeason(page:Page){
 await dismissDecisions(page);
 const button=page.getByRole('button',{name:/시즌 준비하기|시즌 이어가기|포스트시즌 확인하기|시즌 결산과 다음 진로/});
 if(await button.count())await button.click();
}

export async function runSeason(page:Page){
 for(let i=0;i<8;i++){
  await dismissDecisions(page);const before=await readSave(page);
  if(!['PRESEASON','SIMULATING','HIGHLIGHT_READY','MINI_GAME'].includes(before.phase))return;
  await page.getByRole('button',{name:/시즌 (전체|이어서) 자동 진행 →/}).click();
  await expect.poll(async()=>{const s=await readSave(page);return !!pendingDecision(s)||['SEASON_RESULT','POSTSEASON','RETIRED'].includes(s.phase);},{timeout:60000}).toBe(true);
 }
 throw new Error('Season did not finish');
}
