import { FullConfig } from '@playwright/test';

// Configure global logging for Playwright
async function globalSetup(config: FullConfig) {
  // Enable Playwright debug logs
  process.env.DEBUG = 'pw:api,pw:browser*';
  
  console.log('Playwright global setup complete - debug logging enabled');
  return async () => {
    console.log('Playwright global teardown complete');
  };
}

export default globalSetup;