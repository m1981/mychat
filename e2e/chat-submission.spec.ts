import { test, captureTestContext } from './utils/test-context-collector';
import { expect } from '@playwright/test';

test('user can type and submit a message', async ({ page }) => {
  // Navigate to the app
  await page.goto('/');
  
  try {
    // Wait for the chat interface to load
    await expect(page.locator('.dark\\:bg-gray-800')).toBeVisible();
    
    // Find the composer message (the input area)
    const composerMessage = page.locator('[data-testid="save-submit-button"]').first().locator('..').locator('..');
    
    // Click on the composer area to activate it
    await composerMessage.click();
    
    // Type a message in the textarea
    const textarea = page.locator('textarea').first();
    await textarea.fill('Hello, this is a test message');
    
    // Click the "Save & Submit" button
    await page.locator('[data-testid="save-submit-button"]').click();
    
    // Verify the message was sent and appears in the chat
    await expect(page.getByText('Hello, this is a test message')).toBeVisible();
    
    // Verify that an assistant response is generated (may take some time)
    await expect(page.locator('.prose').filter({ hasText: 'Hello, this is a test message' })).toBeVisible();
    
    // Wait for the assistant's response to appear
    await expect(page.locator('[role="assistant"]')).toBeVisible({ timeout: 30000 });
  } catch (error) {
    // Capture detailed context on failure
    await captureTestContext(page, test.info());
    throw error;
  }
});

test('user can edit and save a message', async ({ page }) => {
  // Navigate to the app
  await page.goto('/');
  
  // Wait for the chat interface to load
  await expect(page.locator('.dark\\:bg-gray-800')).toBeVisible();
  
  // Find the composer message and submit an initial message
  const textarea = page.locator('textarea').first();
  await textarea.click();
  await textarea.fill('Initial message');
  await page.locator('[data-testid="save-submit-button"]').click();
  
  // Wait for the message to appear in the chat
  await expect(page.getByText('Initial message')).toBeVisible();
  
  // Find the message and click the edit button
  const messageActions = page.locator('.group-hover\\:visible').first();
  await messageActions.hover();
  await page.locator('button[title="Edit message"]').click();
  
  // Edit the message
  const editTextarea = page.locator('textarea').first();
  await editTextarea.click();
  await editTextarea.fill('Edited message');
  
  // Click the Save button
  await page.locator('[data-testid="save-edit-button"]').click();
  
  // Verify the edited message appears
  await expect(page.getByText('Edited message')).toBeVisible();
  await expect(page.getByText('Initial message')).not.toBeVisible();
});

test('user can add a new message between existing messages', async ({ page }) => {
  // Navigate to the app
  await page.goto('/');
  
  // Submit first message
  const textarea = page.locator('textarea').first();
  await textarea.click();
  await textarea.fill('First message');
  await page.locator('[data-testid="save-submit-button"]').click();
  
  // Wait for response
  await expect(page.locator('[role="assistant"]')).toBeVisible({ timeout: 30000 });
  
  // Click the "+" button to add a new message
  await page.locator('div.h-0.w-0.relative div').first().click();
  
  // Type and submit a new message
  const newTextarea = page.locator('textarea').first();
  await newTextarea.fill('Inserted message');
  await page.locator('[data-testid="save-submit-button"]').click();
  
  // Verify the new message was inserted
  await expect(page.getByText('Inserted message')).toBeVisible();
});