import fs from 'fs';
import path from 'path';
import { test as base } from '@playwright/test';

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