import fs from 'fs';
import path from 'path';
import { test as base, TestInfo } from '@playwright/test';

// Function to capture test context (screenshots, DOM, etc.)
export async function captureTestContext(page, testInfo: TestInfo) {
  const contextDir = path.join('test-logs', testInfo.title.replace(/\s+/g, '-'));
  
  if (!fs.existsSync(contextDir)) {
    fs.mkdirSync(contextDir, { recursive: true });
  }
  
  // Capture screenshot
  const screenshotPath = path.join(contextDir, `screenshot-${Date.now()}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  
  // Capture DOM snapshot
  const html = await page.content();
  fs.writeFileSync(path.join(contextDir, `dom-${Date.now()}.html`), html);
  
  // Capture local storage
  const localStorage = await page.evaluate(() => {
    const items = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      items[key] = localStorage.getItem(key);
    }
    return items;
  });
  
  fs.writeFileSync(
    path.join(contextDir, `localStorage-${Date.now()}.json`), 
    JSON.stringify(localStorage, null, 2)
  );
  
  // Log the capture
  console.log(`Captured test context to ${contextDir}`);
  
  return { screenshotPath, contextDir };
}

// Extend the Playwright test with context collection
export const test = base.extend({
  page: async ({ page }, use) => {
    // Setup context collection
    page.on('console', msg => {
      const testInfo = test.info();
      const contextDir = path.join('test-logs');
      
      if (!fs.existsSync(contextDir)) {
        fs.mkdirSync(contextDir, { recursive: true });
      }
      
      // Log all console messages, not just errors and warnings
      fs.appendFileSync(
        path.join(contextDir, 'console-logs.txt'), 
        `[${new Date().toISOString()}] [${msg.type()}] ${msg.text()}\n`
      );
      
      // For errors and warnings, create a separate file
      if (msg.type() === 'error' || msg.type() === 'warning') {
        fs.appendFileSync(
          path.join(contextDir, 'console-errors.txt'), 
          `[${new Date().toISOString()}] [${msg.type()}] ${msg.text()}\n`
        );
      }
    });
    
    // Capture network requests
    page.on('request', request => {
      const testInfo = test.info();
      const contextDir = path.join('test-logs');
      
      if (!fs.existsSync(contextDir)) {
        fs.mkdirSync(contextDir, { recursive: true });
      }
      
      // Only log API requests to reduce noise
      if (request.url().includes('/api/')) {
        fs.appendFileSync(
          path.join(contextDir, 'network-requests.txt'), 
          `[${new Date().toISOString()}] [REQUEST] ${request.method()} ${request.url()}\n`
        );
      }
    });
    
    // Capture network responses
    page.on('response', response => {
      const testInfo = test.info();
      const contextDir = path.join('test-logs');
      
      if (!fs.existsSync(contextDir)) {
        fs.mkdirSync(contextDir, { recursive: true });
      }
      
      // Only log API responses to reduce noise
      if (response.url().includes('/api/')) {
        fs.appendFileSync(
          path.join(contextDir, 'network-responses.txt'), 
          `[${new Date().toISOString()}] [RESPONSE] ${response.status()} ${response.url()}\n`
        );
      }
    });
    
    await use(page);
  }
});

export { expect } from '@playwright/test';