import { renderHook, act } from '@testing-library/react';
import { vi, it, expect, beforeEach, afterEach } from 'vitest';
import useStore from '@store/store';
import useSubmit from '../useSubmit';

// Mock dependencies
vi.mock('@config/chat/ChatConfig', () => ({
  DEFAULT_PROVIDER: 'anthropic'
}));

vi.mock('@config/chat/ModelConfig', () => ({
  DEFAULT_MODEL_CONFIG: {
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 4096,
    temperature: 0.7,
    presence_penalty: 0,
    top_p: 1,
    frequency_penalty: 0,
    enableThinking: false,
    thinkingConfig: {
      budget_tokens: 16000
    }
  }
}));
 
vi.mock('@src/services/StorageService', () => ({
  StorageService: vi.fn().mockImplementation(() => ({
    checkQuota: vi.fn().mockResolvedValue(true)
  })),
  StorageQuotaError: class StorageQuotaError extends Error {}
}));

vi.mock('@src/services/SubmissionLock', () => ({
  SubmissionLock: vi.fn().mockImplementation(() => ({
    lock: vi.fn().mockReturnValue(true),
    unlock: vi.fn()
  }))
}));

vi.mock('@src/services/SubmissionService', () => ({
  ChatSubmissionService: vi.fn().mockImplementation(() => ({
    submit: vi.fn().mockImplementation(async () => {
      // This is where we need to mock the fetch call
      await global.fetch('/api/chat/anthropic', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          system: 'You are a test assistant.',
          messages: [{ role: 'user', content: 'Hello' }],
          config: {
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 4096,
            temperature: 0.7,
            top_p: 1,
            stream: true
          },
          apiKey: 'test-api-key'
        })
      });
      return true;
    })
  }))
}));

vi.mock('../useStreamHandler', () => ({
  useStreamHandler: vi.fn().mockReturnValue({
    processStream: vi.fn().mockResolvedValue(true)
  })
}));

vi.mock('../useMessageManager', () => ({
  useMessageManager: vi.fn().mockReturnValue({
    getStoreState: vi.fn().mockReturnValue({
      chats: [
        {
          id: '1',
          title: 'Test Chat',
          messages: [
            { role: 'system', content: 'You are a test assistant.' },
            { role: 'user', content: 'Hello' }
          ],
          config: {
            provider: 'anthropic',
            model: 'claude-3-5-sonnet-20241022'
          }
        }
      ],
      currentChatIndex: 0,
      apiKeys: { anthropic: 'test-api-key' }
    }),
    setChats: vi.fn(),
    appendAssistantMessage: vi.fn().mockImplementation((chats) => chats),
    updateMessageContent: vi.fn().mockImplementation((chats) => chats)
  })
}));

vi.mock('../useTitleGeneration', () => ({
  useTitleGeneration: vi.fn().mockReturnValue({
    handleTitleGeneration: vi.fn().mockResolvedValue(true)
  })
}));

vi.mock('../useSubmissionState', () => ({
  useSubmissionState: vi.fn().mockReturnValue({
    dispatch: vi.fn(),
    state: { status: 'idle' }
  })
}));

// Mock the store
vi.mock('@store/store', () => {
  const mockState = {
    abortController: new AbortController(),
    chats: [
      {
        id: '1',
        title: 'Test Chat',
        messages: [
          { role: 'system', content: 'You are a test assistant.' },
          { role: 'user', content: 'Hello' }
        ],
        config: {
          provider: 'anthropic',
          model: 'claude-3-5-sonnet-20241022'
        },
        timestamp: Date.now()
      }
    ],
    currentChatIndex: 0,
    apiKeys: { anthropic: 'test-api-key' },
    isRequesting: false,
    setGenerating: vi.fn(),
    setError: vi.fn(),
    startRequest: vi.fn(),
    stopRequest: vi.fn(),
    resetRequestState: vi.fn(),
    generating: false
  };
  
  // Create a function that returns the state or a specific selector
  const useStoreMock = vi.fn().mockImplementation((selector) => {
    // If selector is a function, call it with the state
    if (typeof selector === 'function') {
      return selector(mockState);
    }
    // Otherwise return the entire state
    return mockState;
  });
  
  // Add getState method to the function
  useStoreMock.getState = vi.fn().mockReturnValue(mockState);
  useStoreMock.setState = vi.fn();
  
  return {
    default: useStoreMock
  };
});

// Mock debug utility
vi.mock('@utils/debug', () => ({
  debug: {
    log: vi.fn(),
    error: vi.fn()
  }
}));

// Mock global fetch
global.fetch = vi.fn().mockImplementation(() => 
  Promise.resolve({
    ok: true,
    status: 200,
    headers: new Headers({ 'Content-Type': 'text/event-stream' }),
    body: {
      getReader: () => ({
        read: vi.fn().mockResolvedValue({ done: true })
      })
    }
  })
);

it('should include system message in request to API', async () => {
  // Render hook
  const { result } = renderHook(() => useSubmit());
  
  // Call handleSubmit
  await act(async () => {
    await result.current.handleSubmit();
  });
  
  // Verify fetch was called with correct body
  expect(global.fetch).toHaveBeenCalledWith(
    expect.stringContaining('/api/chat/anthropic'),
    expect.objectContaining({
      method: 'POST',
      headers: expect.any(Object),
      body: expect.any(String)
    })
  );
  
  // Parse the request body to verify system message is included
  const fetchCall = global.fetch.mock.calls[0];
  const requestBody = JSON.parse(fetchCall[1].body);
  
  expect(requestBody).toEqual(
    expect.objectContaining({
      system: 'You are a test assistant.',
      messages: expect.arrayContaining([
        expect.objectContaining({
          role: 'user',
          content: 'Hello'
        })
      ])
    })
  );
});