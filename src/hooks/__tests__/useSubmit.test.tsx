
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useSubmit from '../useSubmit';
import { DEFAULT_MODEL_CONFIG } from '@config/chat/ModelConfig';
import useStore from '@store/store';
import { createWrapper } from '@utils/test-utils';
import { Mock } from 'vitest';
import { StoreApi } from 'zustand';

type StoreState = ReturnType<typeof useStore.getState>;

// Add utility function for creating mock streams
const createMockStream = (data: string) => {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(data));
      controller.close();
    }
  });
};

// Create mock functions
const mockSetChats = vi.fn();
const mockSetError = vi.fn();
const mockSetGenerating = vi.fn();
const mockSetMessages = vi.fn();
const mockSetFolders = vi.fn();
const mockSetCurrentChatTokenCount = vi.fn();

// Define the store mock structure
const mockStore = {
  getState: vi.fn(),
  setState: vi.fn(),
  subscribe: vi.fn(() => () => {}),
  destroy: vi.fn(),
} as const;

const defaultStoreState: StoreState = {
  messages: [
    {
      role: 'user',
      content: 'Hello'
    }
  ],
  currentChatIndex: 0,
  currentChatTokenCount: 0,
  folders: [],
  chats: [{
    messages: [
      {
        role: 'user',
        content: 'Hello'
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
  setMessages: mockSetMessages,
  setFolders: mockSetFolders,
  setCurrentChatTokenCount: mockSetCurrentChatTokenCount
};

// Mock the store module
vi.mock('@store/store', () => ({
  default: (selector?: (state: StoreState) => unknown) => {
    if (selector) {
      return selector(mockStore.getState());
    }
    return mockStore.getState();
  },
}));

// Add the mock methods to the store
Object.defineProperties(useStore, {
  getState: { get: () => mockStore.getState },
  setState: { get: () => mockStore.setState },
  subscribe: { get: () => mockStore.subscribe },
  destroy: { get: () => mockStore.destroy },
});

describe('useSubmit Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.getState.mockReturnValue(defaultStoreState);
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
      await result.current.handleSubmit();
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
      await result.current.handleSubmit();
    });

    expect(mockSetError).toHaveBeenCalledWith('Server error');
    expect(mockSetGenerating).toHaveBeenCalledWith(false);
  });

  it('should handle network errors', async () => {
    const { result } = renderHook(() => useSubmit(), {
      wrapper: createWrapper()
    });

    vi.clearAllMocks();
    global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(mockSetError).toHaveBeenCalledWith('Network error');
    expect(mockSetGenerating).toHaveBeenCalledWith(false);
  });
});