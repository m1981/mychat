
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
const mockSetCurrentChatIndex = vi.fn();
const mockSetInputRole = vi.fn();
const mockSetApiKey = vi.fn();
const mockSetApiEndpoint = vi.fn();
const mockSetFirstVisit = vi.fn();
const mockSetOpenConfig = vi.fn();
const mockSetTheme = vi.fn();
const mockSetAutoTitle = vi.fn();
const mockSetHideMenuOptions = vi.fn();
const mockSetHideSideMenu = vi.fn();
const mockSetEnterToSubmit = vi.fn();
const mockSetLayoutWidth = vi.fn();
const mockSetDefaultChatConfig = vi.fn();
const mockSetDefaultSystemMessage = vi.fn();
const mockSetProvider = vi.fn();
const mockSetPrompts = vi.fn();

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
  folders: {},
  chats: [{
    messages: [
      {
        role: 'user',
        content: 'Hello'
      }
    ],
    title: '',
    id: '1',
    titleSet: false,
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
  
  // Chat slice setters
  setChats: mockSetChats,
  setError: mockSetError,
  setGenerating: mockSetGenerating,
  setMessages: mockSetMessages,
  setFolders: mockSetFolders,
  setCurrentChatIndex: mockSetCurrentChatIndex,
  setCurrentChatTokenCount: mockSetCurrentChatTokenCount,
  
  // Input slice properties
  inputRole: 'user',
  setInputRole: mockSetInputRole,

  // Auth slice properties
  apiEndpoints: {
    openai: 'https://api.openai.com/v1/chat/completions',
    anthropic: 'https://api.anthropic.com/v1/messages'
  },
  firstVisit: true,
  setApiKey: mockSetApiKey,
  setApiEndpoint: mockSetApiEndpoint,
  setFirstVisit: mockSetFirstVisit,

  // Prompt slice properties
  prompts: [],  // Add empty array for prompts
  setPrompts: mockSetPrompts,  // Add the setPrompts function

  // Config slice properties
  openConfig: false,
  theme: 'dark',
  autoTitle: true,
  hideMenuOptions: false,
  hideSideMenu: false,
  enterToSubmit: true,
  layoutWidth: 'normal',
  defaultChatConfig: {
    provider: 'anthropic',
    modelConfig: DEFAULT_MODEL_CONFIG,
  },
  defaultSystemMessage: 'You are a helpful AI assistant',
  setOpenConfig: mockSetOpenConfig,
  setTheme: mockSetTheme,
  setAutoTitle: mockSetAutoTitle,
  setHideMenuOptions: mockSetHideMenuOptions,
  setHideSideMenu: mockSetHideSideMenu,
  setEnterToSubmit: mockSetEnterToSubmit,
  setLayoutWidth: mockSetLayoutWidth,
  setDefaultChatConfig: mockSetDefaultChatConfig,
  setDefaultSystemMessage: mockSetDefaultSystemMessage,
  setProvider: mockSetProvider
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

    // Mock store state
    mockStore.getState.mockReturnValue({
      ...defaultStoreState,
      autoTitle: true,
      chats: [{
        messages: [
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi there' }
        ],
        title: '',
        id: '1',
        titleSet: false,
        config: {
          provider: 'openai',
          modelConfig: DEFAULT_MODEL_CONFIG
        }
      }],
      currentChatIndex: 0
    });

    // Create response factories to get fresh Response objects
    const createStreamingResponse = () => new Response(
      createMockStream('data: {"content": "Hi there", "role": "assistant", "id": "123"}\n\n'),
      {
        status: 200,
        headers: new Headers({ 'content-type': 'text/event-stream' })
      }
    );

    const createTitleResponse = () => new Response(
      JSON.stringify({ content: "Test Chat Title" }),
      {
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' })
      }
    );

    // Mock fetch to return fresh Response objects
    global.fetch = vi.fn().mockImplementation((url) => {
      if (url.includes('/api/chat/openai')) {
        if (url.includes('stream=true')) {
          return Promise.resolve(createStreamingResponse());
        }
        return Promise.resolve(createTitleResponse());
      }
      return Promise.reject(new Error(`Unexpected URL: ${url}`));
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    // Add debug logging
    console.log('Fetch calls:', (global.fetch as Mock).mock.calls.map(call => call[0]));

    expect(mockSetGenerating).toHaveBeenCalledWith(true);
    expect(mockSetChats).toHaveBeenCalled();
    expect(mockSetGenerating).toHaveBeenCalledWith(false);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('should handle API errors', async () => {
    const { result } = renderHook(() => useSubmit(), {
      wrapper: createWrapper()
    });

    global.fetch = vi.fn().mockImplementation(() => {
      return Promise.resolve(new Response('Server error', {
        status: 500,
        statusText: 'Server Error'
      }));
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

    // Setup mock state
    const mockState = {
      ...defaultStoreState,
      generating: false,
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
      currentChatIndex: 0
    };
    
    mockStore.getState.mockReturnValue(mockState);

    // Clear all mocks before test
    vi.clearAllMocks();
    
    // Mock fetch to simulate a network error
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    await act(async () => {
      await result.current.handleSubmit();
    });

    // Verify the generating state transitions
    expect(mockSetGenerating).toHaveBeenCalledTimes(2);
    expect(mockSetGenerating).toHaveBeenNthCalledWith(1, true);
    expect(mockSetGenerating).toHaveBeenNthCalledWith(2, false);
    
    // Verify that the first call resets the error and the last call sets the network error
    const errorCalls = mockSetError.mock.calls;
    expect(errorCalls[0]).toEqual([null]); // First call should reset error
    expect(errorCalls[errorCalls.length - 1]).toEqual(['Network error']); // Last call should set the network error
  });

  it('should handle non-streaming response', async () => {
    const { result } = renderHook(() => useSubmit(), {
      wrapper: createWrapper()
    });

    global.fetch = vi.fn().mockImplementation(() => {
      return Promise.resolve(new Response(
        JSON.stringify({ content: "Test response" }), 
        {
          status: 200,
          headers: new Headers({
            'content-type': 'application/json'
          })
        }
      ));
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(mockSetGenerating).toHaveBeenCalledWith(true);
    expect(mockSetChats).toHaveBeenCalled();
    expect(mockSetGenerating).toHaveBeenCalledWith(false);
  });
});