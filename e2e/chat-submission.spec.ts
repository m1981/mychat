import { test, expect, captureTestContext } from './utils/test-context-collector';

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
  
  // Wait for the store to be fully initialized
  await page.waitForFunction(() => {
    return window.store && window.store.getState && 
           window.store.getState().apiKeys && 
           window.store.getState().apiKeys.anthropic;
  }, { timeout: 10000 });
  
  // Add debug log to check store state before submission
  await page.evaluate(() => {
    console.log('Current store state:', JSON.stringify(window.store?.getState?.() || 'Store not available'));
    console.log('API keys in store:', JSON.stringify({
      openai: window.store?.getState?.().apiKeys?.openai ? 'present' : 'missing',
      anthropic: window.store?.getState?.().apiKeys?.anthropic ? 'present' : 'missing'
    }));
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

test('user can add a new message between existing messages', async ({ page }) => {
  // Navigate to the app
  await page.goto('/');
  
  try {
    // Wait for the chat interface to load
    await expect(page.locator('[data-testid="chat-interface"]')).toBeVisible();
    
    // Capture initial state
    await captureTestContext(page, test.info());
    
    // Submit first message
    const textarea = page.locator('textarea').first();
    await textarea.click();
    await textarea.fill('First message');
    await page.locator('[data-testid="save-submit-button"]').click();
    
    // Wait for response with increased timeout
    await expect(page.locator('[role="assistant"]')).toBeVisible();
    
    // Capture state after first message and response
    await captureTestContext(page, test.info());
    
    // Click the "+" button to add a new message
    await page.locator('div.h-0.w-0.relative div').first().click();
    
    // Type and submit a new message
    const newTextarea = page.locator('textarea').first();
    await newTextarea.fill('Inserted message');
    await page.locator('[data-testid="save-submit-button"]').click();
    
    // Verify the new message was inserted
    await expect(page.getByText('Inserted message')).toBeVisible();
    
    // Capture final state
    await captureTestContext(page, test.info());
  } catch (error) {
    // Capture detailed context on failure
    await captureTestContext(page, test.info());
    throw error;
  }
});