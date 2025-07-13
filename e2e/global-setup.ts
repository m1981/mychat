import { FullConfig } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import debug from 'debug';

// Configure global logging for Playwright
async function globalSetup(config: FullConfig) {
  // Create logs directory if it doesn't exist
  const logsDir = path.join(process.cwd(), 'test-results', 'server-logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  // Clear previous log file
  const logFile = path.join(logsDir, 'global.log');
  fs.writeFileSync(logFile, '--- New Test Run Started ---\n', 'utf8');

  // Enable Playwright debug logs
  process.env.DEBUG = 'pw:api,pw:browser*,app:*,api:*';
  
  // Configure debug to write to file
  const originalLog = debug.log;
  debug.log = (...args) => {
    const message = args.map(String).join(' ');
    fs.appendFileSync(logFile, `${new Date().toISOString()} ${message}\n`, 'utf8');
    originalLog(...args);
  };
  
  console.log('Playwright global setup complete - debug logging enabled');
  
  // Return teardown function
  return async () => {
    fs.appendFileSync(logFile, '--- Test Run Completed ---\n', 'utf8');
    console.log('Playwright global teardown complete');
  };
}

export default globalSetup;