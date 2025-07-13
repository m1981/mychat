import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import fs from 'fs';

// Reuse your existing path aliases
import { sharedAliases } from './vite.config';

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'test-results', 'server-logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  expect: {
    timeout: 5000,
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,

  // Enhanced reporting configuration
  reporter: process.env.CI 
    ? [
        ['html'], 
        ['junit', { outputFile: 'test-results/e2e-junit-results.xml' }],
        ['json', { outputFile: 'test-results/test-results.json' }]
      ] 
    : [['html', { open: 'never' }], ['list']],

  use: {
    actionTimeout: 5000,
    navigationTimeout: 10000,
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
    command: process.env.CI 
      ? `mkdir -p test-results/server-logs && cd dist && NODE_ENV=test DEBUG=app:* npx serve -s -l 5173 > ../test-results/server-logs/server.log 2>&1`
      : `mkdir -p test-results/server-logs && DEBUG=app:* pnpm dev | tee test-results/server-logs/server.log`,
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    stdout: 'pipe',
    stderr: 'pipe',
    env: {
      NODE_ENV: 'test',
      DEBUG: 'app:*,api:*,pw:api',
      DEBUG_COLORS: 'true',
    },
  },
  // Add global setup to configure logging
  globalSetup: './e2e/global-setup',
});