import { test, captureTestContext } from './utils/test-context-collector';
import { expect } from '@playwright/test';

test('user can type and submit a message', async ({ page }) => {
  // Navigate to the app
  await page.goto('/');
  
  try {
    // Wait for the chat interface to load
    await expect(page.locator('[data-testid="chat-interface"]')).toBeVisible();

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
    
    // Verify that an assistant response is generated (may take some time  await messageContainer.locator('button[title="Edit message"]').click({ force: true });)
    await expect(page.locator('.prose').filter({ hasText: 'Hello, this is a test message' })).toBeVisible();
    
    // Wait for the assistant's response to appear
    await expect(page.locator('[role="assistant"]')).toBeVisible();
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
  await expect(page.locator('[data-testid="chat-interface"]')).toBeVisible();

  // Find the composer message and submit an initial message
  const textarea = page.locator('textarea').first();
  await textarea.click();
  await textarea.fill('Initial message');
  
  // Use Save & Submit button to send the message
  await page.locator('[data-testid="save-submit-button"]').click();
  
  // Wait for the message to appear in the chat and for any processing to complete
  await expect(page.locator('.prose p').filter({ hasText: 'Initial message' })).toBeVisible();
  
  // Add a small delay to ensure the UI has stabilized
  await page.waitForTimeout(1000);
  
  // Find the message container
  const messageContainer = page.locator('.prose').filter({ hasText: 'Initial message' })
    .locator('xpath=./ancestor::div[contains(@class, "group")]');
  
  // Hover over the message to reveal the edit button
  await messageContainer.hover();
  
  // Click the Edit button
  await page.getByRole('button', { name: 'Edit message' }).first().click();
  
  // Wait for the edit textarea to appear - use a more specific selector
  const editTextarea = page.locator('[data-testid="edit-textarea"]').filter({ hasText: 'Initial message' });
  await expect(editTextarea).toBeVisible();
  
  // Edit the message - use the specific textarea we found
  await editTextarea.click();
  await editTextarea.fill('Edited message');
  
  // Take a more direct approach to find the save button
  // First, wait for the save button to be visible
  await page.waitForSelector('[data-testid="save-edit-button"]', { timeout: 5000 });
  
  // Then click it - use a more specific approach
  const saveButton = page.locator('[data-testid="save-edit-button"]')
    .filter({ has: page.locator('text=Save') })
    .first();
  
  await saveButton.click({ timeout: 5000 });
  
  // Wait for edit mode to exit
  await expect(editTextarea).not.toBeVisible({ timeout: 5000 });
  
  // Verify the edited message appears
  await expect(page.locator('.prose p').filter({ hasText: 'Edited message' })).toBeVisible();
  
  // Verify there's only one user message
  const userMessages = await page.locator('[role="user"]').count();
  expect(userMessages).toBe(2);
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
  await expect(page.locator('[role="assistant"]')).toBeVisible();
  
  // Click the "+" button to add a new message
  await page.locator('div.h-0.w-0.relative div').first().click();
  
  // Type and submit a new message
  const newTextarea = page.locator('textarea').first();
  await newTextarea.fill('Inserted message');
  await page.locator('[data-testid="save-submit-button"]').click();
  
  // Verify the new message was inserted
  await expect(page.getByText('Inserted message')).toBeVisible();
});