import { defineConfig } from '@playwright/test';
const base = process.env.NEXT_PUBLIC_BASE_PATH || '';
export default defineConfig({
  testDir: './e2e', timeout: 60000, fullyParallel: false,
  use: { baseURL: 'http://127.0.0.1:4173' + base + '/', trace: 'retain-on-failure' },
  webServer: { command: 'node scripts/serve-static.mjs', url: 'http://127.0.0.1:4173' + base + '/', reuseExistingServer: false },
});
