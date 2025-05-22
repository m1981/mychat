import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import useStore from '../store';
import { DEFAULT_PROVIDER } from '@config/defaults/ChatDefaults';
import { DEFAULT_CHAT_CONFIG } from '@constants/chat';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    getAll: () => store,
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('Configuration Persistence Tests', () => {
  beforeEach(() => {
    localStorageMock.clear();
    
    // Reset the store to initial state
    const store = useStore.getState();
    if (typeof store.resetState === 'function') {
      store.resetState();
    } else {
      // Manual reset if resetState is not available
      useStore.setState({
        chats: [],
        currentChatIndex: -1,
        defaultChatConfig: DEFAULT_CHAT_CONFIG,
        // Add other default values as needed
      });
    }
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should correctly update and persist provider change', () => {
    // Get initial state
    const initialState = useStore.getState();
    expect(initialState.defaultChatConfig.provider).toBe(DEFAULT_PROVIDER);
    
    // Update provider
    const { setDefaultChatConfig } = useStore.getState();
    setDefaultChatConfig({
      provider: 'openai',
      modelConfig: {
        ...initialState.defaultChatConfig.modelConfig,
        model: 'gpt-4o'
      }
    });
    
    // Check if state was updated
    const updatedState = useStore.getState();
    expect(updatedState.defaultChatConfig.provider).toBe('openai');
    expect(updatedState.defaultChatConfig.modelConfig.model).toBe('gpt-4o');
    
    // Check if localStorage was updated
    expect(localStorageMock.setItem).toHaveBeenCalled();
    
    // Create a new chat and verify it uses the new default provider
    const { createChat, chats } = useStore.getState();
    createChat();
    
    expect(chats[0].config.provider).toBe('openai');
    expect(chats[0].config.modelConfig.model).toBe('gpt-4o');
  });

  it('should correctly apply default config to new chats', () => {
    // Update default config
    const { setDefaultChatConfig } = useStore.getState();
    setDefaultChatConfig({
      provider: 'openai',
      modelConfig: {
        model: 'gpt-4o',
        max_tokens: 2000,
        temperature: 0.8,
        capabilities: {
          thinking_mode: {
            enabled: true,
            budget_tokens: 5000
          }
        }
      }
    });
    
    // Create a new chat
    const { createChat, chats } = useStore.getState();
    createChat();
    
    // Verify the new chat has the correct config
    expect(chats[0].config.provider).toBe('openai');
    expect(chats[0].config.modelConfig.model).toBe('gpt-4o');
    expect(chats[0].config.modelConfig.max_tokens).toBe(2000);
    expect(chats[0].config.modelConfig.temperature).toBe(0.8);
    expect(chats[0].config.modelConfig.capabilities?.thinking_mode?.enabled).toBe(true);
    expect(chats[0].config.modelConfig.capabilities?.thinking_mode?.budget_tokens).toBe(5000);
  });

  it('should handle capabilities as an object, not an array', () => {
    // Update default config with capabilities as an array (simulating the bug)
    const { setDefaultChatConfig } = useStore.getState();
    const badConfig = {
      provider: 'openai',
      modelConfig: {
        model: 'gpt-4o',
        max_tokens: 2000,
        temperature: 0.8,
        capabilities: [] as any // Intentionally wrong type
      }
    };
    
    setDefaultChatConfig(badConfig);
    
    // Create a new chat
    const { createChat, chats } = useStore.getState();
    createChat();
    
    // Verify the capabilities is an object, not an array
    expect(Array.isArray(chats[0].config.modelConfig.capabilities)).toBe(false);
    expect(typeof chats[0].config.modelConfig.capabilities).toBe('object');
  });

  it('should correctly update model when provider changes', () => {
    // Set initial config to anthropic
    const { setDefaultChatConfig } = useStore.getState();
    setDefaultChatConfig({
      provider: 'anthropic',
      modelConfig: {
        model: 'claude-3-7-sonnet-20250219',
        max_tokens: 4000
      }
    });
    
    // Change provider to openai
    setDefaultChatConfig({
      provider: 'openai'
    });
    
    // Get updated state
    const updatedState = useStore.getState();
    
    // Verify the model was updated to match the new provider
    expect(updatedState.defaultChatConfig.provider).toBe('openai');
    expect(updatedState.defaultChatConfig.modelConfig.model).toBe('gpt-4o');
  });
});