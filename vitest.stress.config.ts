import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { include: ['stress/**/*.test.ts'], testTimeout: 300000 } });
