import { defineConfig, devices } from '@playwright/test';
import path from 'path';

export default defineConfig({
  testDir: './e2e',
  timeout: 15000, // Global timeout for tests (15 seconds instead of 30)
  expect: {
    timeout: 1000, // Default timeout for assertions (5 seconds instead of default)
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,

  // Enhanced reporting configuration
  reporter: process.env.CI 
    ? [
        ['html'], 
        ['json', { outputFile: 'playwright-report/test-results.json' }],
        ['junit', { outputFile: 'test-results/e2e-junit-results.xml' }],
        ['list']
      ] 
    : [['html', { open: 'never' }], ['list']],

  use: {
    actionTimeout: 1000, // Timeout for actions like click, fill, etc.
    navigationTimeout: 5000, // Timeout for navigations
    baseURL: 'http://localhost:5173',
    trace: process.env.CI ? 'on' : 'on-first-retry', // Always capture traces in CI
    screenshot: 'on',  // Always capture screenshots in CI
    video: process.env.CI ? 'on-first-retry' : 'off', // Capture video on first retry in CI
  },
  
  // Add a custom logger to capture console logs
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
      },
    },
  ],
  webServer: {
    command: process.env.CI ? 'cd dist && npx serve -s -l 5173' : 'pnpm dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});