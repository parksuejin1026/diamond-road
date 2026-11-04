import { expect, type Page } from '@playwright/test';
import type { CareerSave } from '../src/engine/career';
export async function installSave(page: Page, save: CareerSave) {
  await page.goto('./'); await expect(page.getByRole('textbox',{name:'선수 이름'})).toBeVisible();
  await page.evaluate(value=>new Promise<void>((resolve,reject)=>{
    const open=indexedDB.open('diamond-road',1);
    open.onupgradeneeded=()=>open.result.createObjectStore('saves');
    open.onsuccess=()=>{const db=open.result;const tx=db.transaction('saves','readwrite');tx.objectStore('saves').put(value,'active');tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);};
  }),save);
  await page.reload(); await expect(page).toHaveURL(/\/career\/$/);
  if (save.phase === 'RETIRED') return;
  await page.getByRole('button',{name:/시즌 준비하기|시즌 결산과 다음 진로|나의 커리어 돌아보기/}).click();
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
}
