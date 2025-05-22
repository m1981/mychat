import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import useStore from '../store';
import { DEFAULT_PROVIDER } from '@config/defaults/ChatDefaults';

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

// Mock ProviderRegistry
vi.mock('@config/providers/provider.registry', () => ({
  ProviderRegistry: {
    getDefaultModelForProvider: (provider: string) => {
      if (provider === 'openai') return 'gpt-4o';
      if (provider === 'anthropic') return 'claude-3-7-sonnet-20250219';
      throw new Error(`Provider ${provider} not found`);
    },
    getProvider: (provider: string) => {
      if (provider === 'openai') {
        return {
          id: 'openai',
          name: 'OpenAI',
          defaultModel: 'gpt-4o',
          endpoints: ['/api/chat/openai'],
          models: ['gpt-4o']
        };
      }
      if (provider === 'anthropic') {
        return {
          id: 'anthropic',
          name: 'Anthropic',
          defaultModel: 'claude-3-7-sonnet-20250219',
          endpoints: ['/api/chat/anthropic'],
          models: ['claude-3-7-sonnet-20250219']
        };
      }
      throw new Error(`Provider ${provider} not found`);
    }
  }
}));

// Mock ModelRegistry
vi.mock('@config/models/model.registry', () => ({
  ModelRegistry: {
    getModelCapabilities: (modelId: string) => {
      if (modelId === 'gpt-4o') {
        return {
          modelId: 'gpt-4o',
          provider: 'openai',
          maxResponseTokens: 4096,
          defaultResponseTokens: 1024
        };
      }
      if (modelId === 'claude-3-7-sonnet-20250219') {
        return {
          modelId: 'claude-3-7-sonnet-20250219',
          provider: 'anthropic',
          maxResponseTokens: 8192,
          defaultResponseTokens: 4096,
          supportsThinking: true,
          defaultThinkingBudget: 16000
        };
      }
      throw new Error(`Model ${modelId} not found in registry`);
    }
  }
}));

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('Configuration Persistence Tests', () => {
  beforeEach(() => {
    localStorageMock.clear();
    
    // Reset the store to initial state with a fixed configuration
    useStore.setState({
      chats: [],
      currentChatIndex: -1,
      defaultChatConfig: {
        provider: 'anthropic',
        modelConfig: {
          model: 'claude-3-7-sonnet-20250219',
          max_tokens: 4096,
          temperature: 0.7,
          capabilities: {}
        },
        systemPrompt: 'Be my helpful and honest advisor.'
      },
      theme: 'dark',
      autoTitle: true,
      hideMenuOptions: false,
      hideSideMenu: false,
      enterToSubmit: true,
      layoutWidth: 'normal',
    });
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
        model: 'gpt-4o',
        max_tokens: 4096,
        temperature: 0.7
      }
    });
    
    // Check if state was updated
    const updatedState = useStore.getState();
    expect(updatedState.defaultChatConfig.provider).toBe('openai');
    expect(updatedState.defaultChatConfig.modelConfig.model).toBe('gpt-4o');
    
    // Check if localStorage was updated
    expect(localStorageMock.setItem).toHaveBeenCalled();
    
    // Create a new chat
    const { createChat } = useStore.getState();
    const chatId = createChat();
    
    // Get the updated chats
    const { chats } = useStore.getState();
    const newChat = chats.find(chat => chat.id === chatId);
    
    // Verify the new chat has the correct config
    expect(newChat).toBeDefined();
    expect(newChat?.config.provider).toBe('openai');
    expect(newChat?.config.modelConfig.model).toBe('gpt-4o');
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
    const { createChat } = useStore.getState();
    const chatId = createChat();
    
    // Get the updated chats
    const { chats } = useStore.getState();
    const newChat = chats.find(chat => chat.id === chatId);
    
    // Verify the new chat has the correct config
    expect(newChat).toBeDefined();
    expect(newChat?.config.provider).toBe('openai');
    expect(newChat?.config.modelConfig.model).toBe('gpt-4o');
    expect(newChat?.config.modelConfig.max_tokens).toBe(2000);
    expect(newChat?.config.modelConfig.temperature).toBe(0.8);
    expect(newChat?.config.modelConfig.capabilities?.thinking_mode?.enabled).toBe(true);
    expect(newChat?.config.modelConfig.capabilities?.thinking_mode?.budget_tokens).toBe(5000);
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
    const { createChat } = useStore.getState();
    const chatId = createChat();
    
    // Get the updated chats
    const { chats } = useStore.getState();
    const newChat = chats.find(chat => chat.id === chatId);
    
    // Verify the capabilities is an object, not an array
    expect(newChat).toBeDefined();
    expect(Array.isArray(newChat?.config.modelConfig.capabilities)).toBe(false);
    expect(typeof newChat?.config.modelConfig.capabilities).toBe('object');
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