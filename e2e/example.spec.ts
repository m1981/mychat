import { test, expect } from '@playwright/test';

test('basic app navigation', async ({ page }) => {
  await page.goto('/');
  
  // Wait for the app to load
  await expect(page.locator('#root')).toBeVisible();
  
  // Add your app-specific tests here
  // For example:
  // await page.getByRole('button', { name: 'New Chat' }).click();
});