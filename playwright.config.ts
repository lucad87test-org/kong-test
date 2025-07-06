import { defineConfig, devices } from '@playwright/test';
import dotenvx from '@dotenvx/dotenvx';
import path from 'path';

// Read from ".env" encrypted file
dotenvx.config({ path: path.resolve(__dirname, '.env') });

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 1,
  timeout: 120_000, // 2 minutes
  globalTimeout: 5 * 60 * 1000, // 5 minutes

  reporter: [
    ['html'], 
    ['list', { printSteps: true }]
  ],

  use: {
    baseURL: 'https://cloud.konghq.com/eu/',
    trace: 'on-first-retry',
    headless: true,
    testIdAttribute: 'data-testid',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

});
