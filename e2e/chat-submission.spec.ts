import { test, captureTestContext } from './utils/test-context-collector';
import { expect } from '@playwright/test';

// Setup function to inject API keys before tests
async function setupApiKeys(page) {
  // Get API keys from environment variables
  const openaiKey = process.env.VITE_OPENAI_API_KEY || process.env.TEST_OPENAI_API_KEY || '';
  const anthropicKey = process.env.VITE_ANTHROPIC_API_KEY || process.env.TEST_ANTHROPIC_API_KEY || '';
  
  console.log('Setting up API keys:', 
    openaiKey ? 'OpenAI key present' : 'OpenAI key missing',
    anthropicKey ? 'Anthropic key present' : 'Anthropic key missing'
  );
  
  // Set API keys via localStorage
  await page.addInitScript(({ openaiKey, anthropicKey }) => {
    const store = {
      apiKeys: {
        openai: openaiKey,
        anthropic: anthropicKey
      },
      apiEndpoints: {
        openai: '/api/chat/openai',
        anthropic: '/api/chat/anthropic'
      },
      firstVisit: false
    };
    localStorage.setItem('auth-store', JSON.stringify(store));
    console.log('API keys set in localStorage:', JSON.stringify({
      openai: openaiKey ? 'present' : 'missing',
      anthropic: anthropicKey ? 'present' : 'missing'
    }));
  }, { openaiKey, anthropicKey });

  // Add a check to verify localStorage after navigation
  await page.goto('/');
  await page.evaluate(() => {
    const storedData = localStorage.getItem('auth-store');
    console.log('Stored auth data after page load:', storedData);
    return storedData;
  });
}

test('user can type and submit a message', async ({ page }) => {
  // Setup API keys
  await setupApiKeys(page);
  
  // Add debug log to check store state before submission
  await page.evaluate(() => {
    console.log('Current store state:', JSON.stringify(window.store?.getState?.() || 'Store not available'));
  });

  // Navigate to the app
  await page.goto('/');
  
  try {
    // Capture initial state for reference
    await captureTestContext(page, test.info());
    
    // Wait for the chat interface to load
    await expect(page.locator('[data-testid="chat-interface"]')).toBeVisible();

    // Find the composer message (the input area)
    const composerMessage = page.locator('[data-testid="save-submit-button"]').first().locator('..').locator('..');
    
    // Click on the composer area to activate it
    await composerMessage.click();
    
    // Type a message in the textarea
    const textarea = page.locator('textarea').first();
    await textarea.fill('Hello, this is a test message');
    
    // Capture state after typing message
    await captureTestContext(page, test.info());
    
    // Click the "Save & Submit" button
    await page.locator('[data-testid="save-submit-button"]').click();

    // Verify the message was sent and appears in the chat
    await expect(page.locator('[data-testid="message-user"]').filter({ hasText: 'Hello, this is a test message' })).toBeVisible();

    // Capture state after message is sent
    await captureTestContext(page, test.info());

    // Wait for assistant response with increased timeout
    await expect(page.locator('[role="assistant"]')).toBeVisible();

    // Capture final state with assistant response
    await captureTestContext(page, test.info());
  } catch (error) {
    // Capture detailed context on failure
    await captureTestContext(page, test.info());
    throw error;
  }
});

test('user can edit and save a message', async ({ page }) => {
  // Navigate to the app
  await page.goto('/');
  
  try {
    // Wait for the chat interface to load
    await expect(page.locator('[data-testid="chat-interface"]')).toBeVisible();
    
    // Capture initial state
    await captureTestContext(page, test.info());

    // Find the composer message and submit an initial message
    const textarea = page.locator('textarea').first();
    await textarea.click();
    await textarea.fill('Initial message');
    
    // Use Save & Submit button to send the message
    await page.locator('[data-testid="save-submit-button"]').click();
    
    // Wait for the message to appear in the chat and for any processing to complete
    await expect(page.locator('.prose p').filter({ hasText: 'Initial message' })).toBeVisible();
    
    // Capture state after message is sent
    await captureTestContext(page, test.info());
    
    // Add a small delay to ensure the UI has stabilized
    await page.waitForTimeout(1000);
    
    // Find the message container
    const messageContainer = page.locator('.prose').filter({ hasText: 'Initial message' })
      .locator('xpath=./ancestor::div[contains(@class, "group")]');
    
    // Hover over the message to reveal the edit button
    await messageContainer.hover();
    
    // Click the Edit button
    await page.getByRole('button', { name: 'Edit message' }).first().click();
    
    // Capture state in edit mode
    await captureTestContext(page, test.info());
    
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
    
    // Capture state after edit is saved
    await captureTestContext(page, test.info());

    // Verify the edited message appears
    await expect(page.locator('.prose p').filter({ hasText: 'Edited message' })).toBeVisible();
    
    // Verify there's only one user message
    const userMessages = await page.locator('[role="user"]').count();
    expect(userMessages).toBe(2);
  } catch (error) {
    // Capture detailed context on failure
    await captureTestContext(page, test.info());
    throw error;
  }
});

test('streaming response appears progressively in chat area', async ({ page }) => {
  // Setup API keys with focus on Anthropic
  await setupApiKeys(page);
  
  // Navigate to the app
  await page.goto('/');
  
  try {
    // Wait for the chat interface to load
    await expect(page.locator('[data-testid="chat-interface"]')).toBeVisible();
    
    // Capture initial state
    await captureTestContext(page, test.info());
    
    // Select Anthropic model from dropdown if available
    const modelSelector = page.locator('[data-testid="model-selector"]');
    if (await modelSelector.isVisible()) {
      await modelSelector.click();
      await page.locator('text=claude-3-7-sonnet').first().click();
    }
    
    // Type a message that will trigger a longer response to better observe streaming
    const textarea = page.locator('textarea').first();
    await textarea.click();
    await textarea.fill('Write a short poem about streaming data, one line at a time');
    
    // Start request timing
    const startTime = Date.now();
    
    // Submit the message
    await page.locator('[data-testid="save-submit-button"]').click();
    
    // Verify the message was sent
    await expect(page.locator('[data-testid="message-user"]')
      .filter({ hasText: 'Write a short poem about streaming data' })).toBeVisible();
    
    // Wait for the assistant response container to appear
    const assistantResponse = page.locator('[role="assistant"]').first();
    await expect(assistantResponse).toBeVisible({ timeout: 10000 });
    
    // Capture the initial response length
    const initialText = await assistantResponse.textContent() || '';
    const initialLength = initialText.length;
    
    // Wait a short time for streaming to progress
    await page.waitForTimeout(2000);
    
    // Capture the updated response
    const midwayText = await assistantResponse.textContent() || '';
    const midwayLength = midwayText.length;
    
    // Verify that the response is growing (streaming is working)
    expect(midwayLength).toBeGreaterThan(initialLength);
    
    // Wait for streaming to complete (max 30 seconds)
    await expect(async () => {
      // Check if response has stopped changing for 3 seconds
      const currentText = await assistantResponse.textContent() || '';
      const currentLength = currentText.length;
      await page.waitForTimeout(3000);
      const newText = await assistantResponse.textContent() || '';
      const newLength = newText.length;
      console.log(`Checking if streaming completed: ${currentLength} vs ${newLength} characters`);
      return currentText === newText && newLength > midwayLength;
    }).toPass({ timeout: 30000 });
    
    // Calculate and log response time
    const endTime = Date.now();
    console.log(`Streaming response completed in ${endTime - startTime}ms`);

    // Capture final state with complete response
    await captureTestContext(page, test.info());
    
    // Verify the final response contains meaningful content
    const finalText = await assistantResponse.textContent() || '';
    const finalLength = finalText.length;

    // Add specific content length assertions
    expect(finalLength).toBeGreaterThan(50);
    console.log(`Final response length: ${finalLength} characters`);

    // Verify the response contains poetry-related content
    expect(finalText.toLowerCase()).toContain('stream');
    expect(finalText.split('\n').length).toBeGreaterThan(2);
  } catch (error) {
    // Capture detailed context on failure
    await captureTestContext(page, test.info());
    throw error;
  }
});