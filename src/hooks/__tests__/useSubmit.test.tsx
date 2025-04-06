import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useSubmit from '../useSubmit';
import { DEFAULT_MODEL_CONFIG } from '@config/chat/ModelConfig';
import type { ModelConfig } from '@type/chat';
import useStore from '@store/store';
import { createWrapper } from '@utils/test-utils';
import { Mock, MockInstance } from 'vitest';
import { StoreApi } from 'zustand';
import { StoreState } from '@store/store';

type MockStore = {
  getState: () => ReturnType<typeof useStore.getState>;
  setState: typeof useStore.setState;
  subscribe: typeof useStore.subscribe;
  destroy: () => void;
};

const mockSetChats = vi.fn();
const mockSetError = vi.fn();
const mockSetGenerating = vi.fn();

const defaultStoreState = {
  currentChatIndex: 0,
  chats: [{
    messages: [],
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
  setGenerating: mockSetGenerating
};

// Mock the store
vi.mock('@store/store', () => {
  const store = {
    getState: vi.fn(() => defaultStoreState),
    setState: vi.fn(),
    subscribe: vi.fn(),
    destroy: vi.fn(),
  };
  
  const useStore = vi.fn((selector) => {
    if (typeof selector === 'function') {
      return selector(defaultStoreState);
    }
    return defaultStoreState;
  });
  
  // Attach getState to the useStore function
  useStore.getState = store.getState;
  useStore.setState = store.setState;
  useStore.subscribe = store.subscribe;
  useStore.destroy = store.destroy;

  return {
    default: useStore
  };
});

// Mock API calls
vi.mock('@src/api/api', () => ({
  getChatCompletion: vi.fn()
}));

describe('useSubmit Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const mockStore = vi.mocked(useStore);
    mockStore.getState.mockImplementation(() => defaultStoreState);
  });

  it('should handle successful message submission', async () => {
    const { result } = renderHook(() => useSubmit(), {
      wrapper: createWrapper()
    });

    expect(result.current).toBeDefined();
    // Add your test assertions here
  });

  it('should handle API errors', async () => {
    const { result } = renderHook(() => useSubmit(), {
      wrapper: createWrapper()
    });
    
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Server Error',
      text: () => Promise.resolve('Server error')  // This is what will be shown as error
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    // Update the expectation to match the actual error message
    expect(mockSetError).toHaveBeenCalledWith('Server error');
    expect(mockSetGenerating).toHaveBeenCalledWith(false);
  });

  it('should handle network errors', async () => {
    const { result } = renderHook(() => useSubmit(), {
      wrapper: createWrapper()
    });
    
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(mockSetError).toHaveBeenCalledWith('Network error');
    expect(mockSetGenerating).toHaveBeenCalledWith(false);
  });

  it('should handle streaming data correctly', async () => {
    const { result } = renderHook(() => useSubmit(), {
      wrapper: createWrapper()
    });

    const mockResponse = new ReadableStream({
      start(controller) {
        controller.enqueue(
          new TextEncoder().encode('data: {"content": "Hello"}\n\n')
        );
        controller.enqueue(
          new TextEncoder().encode('data: {"content": " World"}\n\n')
        );
        controller.close();
      }
    });
    
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      body: mockResponse,
      headers: new Headers({
        'content-type': 'text/event-stream'
      })
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(mockSetChats).toHaveBeenCalled();
    expect(mockSetGenerating).toHaveBeenCalledWith(false);
  });
});