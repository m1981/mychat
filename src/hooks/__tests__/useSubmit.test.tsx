
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useSubmit from '../useSubmit';
import { DEFAULT_MODEL_CONFIG } from '@config/chat/ModelConfig';
import useStore from '@store/store';
import { createWrapper } from '@utils/test-utils';
import { Mock } from 'vitest';
import { StoreApi } from 'zustand';

type StoreState = ReturnType<typeof useStore.getState>;
type MockStore = {
  getState: Mock;
  setState: Mock;
  subscribe: Mock;
  destroy: Mock;
} & StoreApi<StoreState>;

const mockSetChats = vi.fn();
const mockSetError = vi.fn();
const mockSetGenerating = vi.fn();
const mockSetMessages = vi.fn();
const mockSetFolders = vi.fn();
const mockSetCurrentChatTokenCount = vi.fn();

const defaultStoreState: StoreState = {
  messages: [
    {
      role: 'user',
      content: 'Hello',
      id: '1'
    }
  ],
  currentChatIndex: 0,
  currentChatTokenCount: 0,
  folders: [],
  chats: [{
    messages: [
      {
        role: 'user',
        content: 'Hello',
        id: '1'
      }
    ],
    title: '',
    id: '1',
    config: {
      provider: 'openai',
      modelConfig: DEFAULT_MODEL_CONFIG
    }
  }],
  apiKeys: {
    openai: 'test-key'
  },
  error: null,
  generating: false,
  setChats: mockSetChats,
  setError: mockSetError,
  setGenerating: mockSetGenerating,
  setMessages: vi.fn(),
  setFolders: vi.fn(),
  setCurrentChatTokenCount: vi.fn()
};

// Mock the store
vi.mock('@store/store', () => {
  const store = {
    getState: vi.fn(() => defaultStoreState),
    setState: vi.fn(),
    subscribe: vi.fn(),
    destroy: vi.fn(),
  };
  
  const useStore = vi.fn((selector?: (state: any) => any) => {
    if (typeof selector === 'function') {
      return selector(defaultStoreState);
    }
    return defaultStoreState;
  });
  
  useStore.getState = store.getState;
  useStore.setState = store.setState;
  useStore.subscribe = store.subscribe;
  useStore.destroy = store.destroy;

  return {
    default: useStore
  };
});

// Mock the API module
vi.mock('@api/api', () => ({
  getChatCompletion: vi.fn().mockImplementation(async () => {
    throw new Error('Network error');
  })
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

const createMockStream = (data: string) => {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(data));
      controller.close();
    }
  });
};

describe('useSubmit Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const mockStore = vi.mocked(useStore) as unknown as MockStore;
    mockStore.getState.mockImplementation(() => defaultStoreState);
    
    // Reset fetch mock for each test
    mockFetch.mockReset();
  });

  it('should handle successful message submission', async () => {
    const { result } = renderHook(() => useSubmit(), {
      wrapper: createWrapper()
    });

    const mockStream = createMockStream('data: {"content": "Hi there", "role": "assistant", "id": "123"}\n\n');
    
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      body: mockStream,
      headers: new Headers({
        'content-type': 'text/event-stream'
      })
    });

    await act(async () => {
      await result.current.handleSubmit({
        message: 'Test message',
        isRegenerating: false,
        conversationId: '1',
        parentMessageId: null
      });
    });

    expect(mockSetGenerating).toHaveBeenCalledWith(true);
    expect(mockSetChats).toHaveBeenCalled();
    expect(mockSetGenerating).toHaveBeenCalledWith(false);
  });

  it('should handle API errors', async () => {
    const { result } = renderHook(() => useSubmit(), {
      wrapper: createWrapper()
    });

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Server Error',
      text: () => Promise.resolve('Server error')
    });

    await act(async () => {
      await result.current.handleSubmit({
        message: 'Test message',
        isRegenerating: false,
        conversationId: '1',
        parentMessageId: null
      });
    });

    expect(mockSetError).toHaveBeenCalledWith('Server error');
    expect(mockSetGenerating).toHaveBeenCalledWith(false);
  });

  it('should handle network errors', async () => {
    const { result } = renderHook(() => useSubmit(), {
      wrapper: createWrapper()
    });

    // Clear all mocks before the test
    vi.clearAllMocks();

    // Mock fetch to throw a specific network error
    global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));

    await act(async () => {
      await result.current.handleSubmit({
        message: 'Test message',
        isRegenerating: false,
        conversationId: '1',
        parentMessageId: null
      });
    });

    // Check if setError was called with 'Network error'
    const setErrorCalls = mockSetError.mock.calls;
    expect(setErrorCalls.some(call => call[0] === 'Network error')).toBe(true);
    expect(mockSetGenerating).toHaveBeenCalledWith(false);
  });

  it('should handle streaming data correctly', async () => {
    const { result } = renderHook(() => useSubmit(), {
      wrapper: createWrapper()
    });

    const mockStream = createMockStream(
      'data: {"content": "Hello", "role": "assistant", "id": "123"}\n\n' +
      'data: {"content": " World", "role": "assistant", "id": "123"}\n\n'
    );

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      body: mockStream,
      headers: new Headers({
        'content-type': 'text/event-stream'
      })
    });

    await act(async () => {
      await result.current.handleSubmit({
        message: 'Test message',
        isRegenerating: false,
        conversationId: '1',
        parentMessageId: null
      });
    });

    expect(mockSetChats).toHaveBeenCalled();
    expect(mockSetGenerating).toHaveBeenCalledWith(false);
  });
});