import { configureStore } from '@reduxjs/toolkit';
import { render, RenderOptions } from '@testing-library/react';
import React, { PropsWithChildren } from 'react';
import { Provider } from 'react-redux';
import { CapabilityDefinition } from '@type/capability';
import { ProviderKey } from '@type/chat';
import { capabilityRegistry } from '@capabilities/registry';

/**
 * Creates a test store with optional initial state
 */
export function createTestStore(initialState = {}) {
  // Define default state structure
  const defaultState = {
    chats: [],
    currentChatIndex: -1,
    apiKeys: {
      openai: 'test-openai-key',
      anthropic: 'test-anthropic-key'
    },
    apiEndpoints: {
      openai: 'https://api.openai.com/v1',
      anthropic: 'https://api.anthropic.com'
    },
    theme: 'light',
    autoTitle: true,
    prompts: [],
    defaultChatConfig: {
      provider: 'openai',
      modelConfig: {
        model: 'gpt-4o',
        temperature: 0.7,
        capabilities: {}
      }
    },
    defaultSystemMessage: 'You are a helpful assistant.',
    updateCapabilityConfig: (chatId, capabilityId, config) => {
      // Mock implementation that updates the store
      const state = store.getState();
      const chatIndex = state.chats.findIndex(chat => chat.id === chatId);
      
      if (chatIndex === -1) return;
      
      const chat = state.chats[chatIndex];
      const updatedChat = {
        ...chat,
        config: {
          ...chat.config,
          modelConfig: {
            ...chat.config.modelConfig,
            capabilities: {
              ...chat.config.modelConfig.capabilities,
              [capabilityId]: config
            }
          }
        }
      };
      
      const updatedChats = [...state.chats];
      updatedChats[chatIndex] = updatedChat;
      
      store.dispatch({
        type: 'chat/updateChats',
        payload: updatedChats
      });
    }
  };
  
  // Merge default state with provided initial state
  const mergedState = {
    ...defaultState,
    ...initialState
  };
  
  // Create a Redux store with the merged state
  const store = configureStore({
    reducer: (state = mergedState, action) => {
      switch (action.type) {
        case 'chat/updateChats':
          return {
            ...state,
            chats: action.payload
          };
        case 'chat/updateChatConfig':
          const { chatId, config } = action.payload;
          const chatIndex = state.chats.findIndex(chat => chat.id === chatId);
          
          if (chatIndex === -1) return state;
          
          const updatedChats = [...state.chats];
          updatedChats[chatIndex] = {
            ...updatedChats[chatIndex],
            config
          };
          
          return {
            ...state,
            chats: updatedChats
          };
        default:
          return state;
      }
    },
    preloadedState: mergedState
  });
  
  return store;
}

/**
 * Custom render function that includes Redux provider
 */
export function renderWithStore(
  ui: React.ReactElement,
  {
    initialState = {},
    store = createTestStore(initialState),
    ...renderOptions
  } = {}
) {
  function Wrapper({ children }: PropsWithChildren<{}>): JSX.Element {
    return React.createElement(Provider, { store }, children);
  }
  
  return { store, ...render(ui, { wrapper: Wrapper, ...renderOptions }) };
}

/**
 * Creates a mock capability for testing
 */
export function createMockCapability(overrides = {}): CapabilityDefinition {
  return {
    id: 'mock-capability',
    name: 'Mock Capability',
    priority: 100,
    isSupported: () => true,
    configComponent: () => React.createElement('div', {}, 'Mock Component'),
    formatRequestMiddleware: (req) => ({ ...req, mock: true }),
    parseResponseMiddleware: (res) => ({ ...res, mock: true }),
    ...overrides
  };
}

/**
 * Registers mock capabilities for testing
 */
export function registerMockCapabilities() {
  // Clear existing capabilities
  (capabilityRegistry as any).capabilities = [];
  
  // Register mock capabilities with different priorities and support
  capabilityRegistry.registerCapability(createMockCapability({
    id: 'high-priority',
    name: 'High Priority Capability',
    priority: 300,
    formatRequestMiddleware: (req) => ({ ...req, high: true })
  }));
  
  capabilityRegistry.registerCapability(createMockCapability({
    id: 'medium-priority',
    name: 'Medium Priority Capability',
    priority: 200,
    formatRequestMiddleware: (req) => ({ ...req, medium: true })
  }));
  
  capabilityRegistry.registerCapability(createMockCapability({
    id: 'low-priority',
    name: 'Low Priority Capability',
    priority: 100,
    formatRequestMiddleware: (req) => ({ ...req, low: true })
  }));
  
  capabilityRegistry.registerCapability(createMockCapability({
    id: 'openai-only',
    name: 'OpenAI Only Capability',
    isSupported: (provider: ProviderKey) => provider === 'openai',
    formatRequestMiddleware: (req) => ({ ...req, openai_specific: true })
  }));
  
  capabilityRegistry.registerCapability(createMockCapability({
    id: 'anthropic-only',
    name: 'Anthropic Only Capability',
    isSupported: (provider: ProviderKey) => provider === 'anthropic',
    formatRequestMiddleware: (req) => ({ ...req, anthropic_specific: true })
  }));
}

/**
 * Clears all registered capabilities
 */
export function clearMockCapabilities() {
  (capabilityRegistry as any).capabilities = [];
}

/**
 * Mock localStorage for testing
 */
export function setupMockLocalStorage() {
  const localStorageMock = (() => {
    let store: Record<string, string> = {};
    
    return {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => {
        store[key] = value.toString();
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        store = {};
      },
      length: 0,
      key: (index: number) => ''
    };
  })();
  
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock
  });
  
  return localStorageMock;
}