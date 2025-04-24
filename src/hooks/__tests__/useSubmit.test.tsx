
import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useSubmit from '../useSubmit';
import { DEFAULT_MODEL_CONFIG } from '@config/chat/ModelConfig';
import { ChatInterface, MessageInterface } from '@type/chat';

// Define interface for store state
interface MockStoreState {
  messages: MessageInterface[];
  currentChatIndex: number;
  currentChatTokenCount: number;
  folders: Record<string, any>;
  chats: ChatInterface[];
  apiKeys: {
    openai: string;
    [key: string]: string;
  };
  error: string | null;
  generating: boolean;
  setChats: Mock;
  setError: Mock;
  setGenerating: Mock;
  setMessages: Mock;
  setFolders: Mock;
  setCurrentChatIndex: Mock;
  setCurrentChatTokenCount: Mock;
}

// Define store type
type MockStore = ((selector?: (state: MockStoreState) => any) => any) & {
  getState: () => MockStoreState;
};

// Mock the storage module
vi.mock('@utils/storage', () => ({
  checkStorageQuota: vi.fn().mockResolvedValue(undefined)
}));

// Define the store mock structure with proper typing
const createMockStore = (): MockStoreState => ({
  messages: [{ role: 'user', content: 'Hello' }],
  currentChatIndex: 0,
  currentChatTokenCount: 0,
  folders: {},
  chats: [{
    messages: [{ role: 'user', content: 'Hello' }],
    title: '',
    id: '1',
    titleSet: false,
    config: {
      provider: 'openai',
      modelConfig: DEFAULT_MODEL_CONFIG
    }
  }],
  apiKeys: { openai: 'test-key' },
  error: null,
  generating: false,
  setChats: vi.fn(),
  setError: vi.fn(),
  setGenerating: vi.fn(),
  setMessages: vi.fn(),
  setFolders: vi.fn(),
  setCurrentChatIndex: vi.fn(),
  setCurrentChatTokenCount: vi.fn(),
});

let mockStoreState: MockStoreState;

// Mock the store module
vi.mock('@store/store', () => {
  const storeFunction = (selector?: (state: MockStoreState) => any) => {
    if (selector) {
      return selector(mockStoreState);
    }
    return mockStoreState;
  };

  const store = Object.assign(storeFunction, {
    getState: () => mockStoreState
  }) as MockStore;

  return { default: store };
});

describe('useSubmit hook', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
    
    // Create fresh mock state for each test
    mockStoreState = createMockStore();

    // Mock fetch globally
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      body: {
        getReader: () => ({
          read: vi.fn().mockResolvedValue({ done: true }),
        }),
      },
    });
  });

  it('should coordinate services correctly', async () => {
    const { result } = renderHook(() => useSubmit());

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(mockStoreState.setGenerating).toHaveBeenCalledWith(true);
    expect(mockStoreState.setError).toHaveBeenCalledWith(null);
  });

  it('should handle errors correctly', async () => {
    // Mock fetch to return error
    global.fetch = vi.fn().mockRejectedValue(new Error('API Error'));

    const { result } = renderHook(() => useSubmit());

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(mockStoreState.setError).toHaveBeenCalledTimes(2);
    expect(mockStoreState.setError).toHaveBeenNthCalledWith(1, null);
    expect(mockStoreState.setError).toHaveBeenNthCalledWith(2, 'API Error');
  });

  it('should not submit when already generating', async () => {
    mockStoreState.generating = true;

    const { result } = renderHook(() => useSubmit());

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(mockStoreState.setChats).not.toHaveBeenCalled();
  });
});