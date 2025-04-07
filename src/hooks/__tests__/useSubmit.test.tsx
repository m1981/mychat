
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

    // Create a function that returns a new Response each time it's called
    global.fetch = vi.fn().mockImplementation(() => {
      return Promise.resolve(new Response(
        createMockStream('data: {"content": "Hi there", "role": "assistant", "id": "123"}\n\n'),
        {
          status: 200,
          headers: new Headers({
            'content-type': 'text/event-stream'
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

    global.fetch = vi.fn().mockImplementation(() => {
      throw new Error('Network error');
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(mockSetError).toHaveBeenCalledWith('Network error');
    expect(mockSetGenerating).toHaveBeenCalledWith(false);
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