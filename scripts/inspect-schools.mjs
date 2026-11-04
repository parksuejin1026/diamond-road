import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto('https://www.korea-baseball.com/info/team/team_list', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.getByText('18세 이하부', { exact: true }).first().click();
const teams = [];
for (let index = 1; index <= 4; index++) {
  await page.goto('https://www.korea-baseball.com/info/team/team_list?page=' + index + '&kind_cd=31&season=2026&sido_cd=00', { waitUntil: 'domcontentloaded' });
  const rows = await page.locator('a[href*="team_player?club_idx="]').evaluateAll(nodes => nodes.map(n => ({ name: n.textContent.trim(), url: n.href, fields: Array.from(n.closest('dl').querySelectorAll('dd')).map(d => d.textContent.trim()) })));
  teams.push(...rows);
}
console.log('COUNT', teams.length, 'SAMPLE', JSON.stringify(teams.slice(0, 3)));
await mkdir('artifacts/reference', { recursive: true });
await writeFile('artifacts/reference/kbsa-u18-2026.json', JSON.stringify(teams, null, 2));
await browser.close();
