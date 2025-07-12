import { defineConfig, devices } from '@playwright/test';
import path from 'path';

// Reuse your existing path aliases
import { sharedAliases } from './vite.config';

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  expect: {
    timeout: 5000,  // Increased from 1000ms to 5000ms
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,

  // Enhanced reporting configuration
  reporter: process.env.CI 
    ? [['html'], ['junit', { outputFile: 'test-results/e2e-junit-results.xml' }]] 
    : [['html', { open: 'never' }], ['list']],

  use: {
    actionTimeout: 5000, // Increased from 1000ms to 5000ms
    navigationTimeout: 10000, // Increased from 5000ms to 10000ms
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: process.env.CI ? 'cd dist && npx serve -s -l 5173' : 'pnpm dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
  // Add global setup to configure logging
  globalSetup: './e2e/global-setup',
});