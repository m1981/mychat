import { vi } from 'vitest';
import { AIProviderInterface, FormattedRequest, ProviderResponse } from '@type/provider';
import { MessageInterface, ProviderKey } from '@type/chat';

/**
 * Creates a mock provider implementation for testing
 */
export function createMockProvider(providerId: ProviderKey = 'mock'): AIProviderInterface {
  return {
    id: providerId,
    name: `${providerId.charAt(0).toUpperCase()}${providerId.slice(1)} Provider`,
    endpoints: [`https://api.${providerId}.com/v1`],
    models: [`${providerId}-model-1`, `${providerId}-model-2`],
    
    formatRequest: vi.fn().mockImplementation((config, messages) => {
      // Basic request formatting
      return {
        model: config.model,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        temperature: config.temperature || 0.7,
        provider: providerId
      };
    }),
    
    parseResponse: vi.fn().mockImplementation((response) => {
      // Basic response parsing
      if (response.choices && response.choices[0]?.message) {
        return {
          content: response.choices[0].message.content,
          thinking: response.choices[0].thinking
        };
      }
      
      return {
        content: response.content || 'Mock response',
        thinking: response.thinking
      };
    }),
    
    parseStreamingResponse: vi.fn().mockImplementation((chunk) => {
      return {
        content: chunk.content || '',
        thinking: chunk.thinking
      };
    }),
    
    submitCompletion: vi.fn().mockImplementation((formattedRequest: FormattedRequest): Promise<ProviderResponse> => {
      // Simulate different responses based on capabilities
      if (formattedRequest.thinking) {
        return Promise.resolve({
          content: `${providerId} response with thinking`,
          thinking: `${providerId} thinking process`
        });
      }
      
      return Promise.resolve({
        content: `${providerId} standard response`
      });
    })
  };
}

/**
 * Creates mock OpenAI provider
 */
export const mockOpenAIProvider = createMockProvider('openai');

/**
 * Creates mock Anthropic provider
 */
export const mockAnthropicProvider = createMockProvider('anthropic');

/**
 * Mock provider registry for testing
 */
export const mockProviderRegistry = {
  getProvider: vi.fn().mockImplementation((providerId: ProviderKey) => {
    switch (providerId) {
      case 'openai':
        return mockOpenAIProvider;
      case 'anthropic':
        return mockAnthropicProvider;
      default:
        throw new Error(`Provider "${providerId}" not found`);
    }
  }),
  
  getProviderCapabilities: vi.fn().mockImplementation((providerId: ProviderKey) => {
    switch (providerId) {
      case 'openai':
        return {
          supportsThinking: false,
          supportsStreaming: true,
          supportsSystemPrompt: true,
          maxCompletionTokens: 4096,
          defaultModel: 'gpt-4o'
        };
      case 'anthropic':
        return {
          supportsThinking: true,
          supportsStreaming: true,
          supportsSystemPrompt: false,
          maxCompletionTokens: 8192,
          defaultModel: 'claude-3-7-sonnet-20250219'
        };
      default:
        throw new Error(`Provider "${providerId}" not found`);
    }
  }),
  
  getProviders: vi.fn().mockReturnValue({
    openai: mockOpenAIProvider,
    anthropic: mockAnthropicProvider
  }),
  
  providers: {
    openai: mockOpenAIProvider,
    anthropic: mockAnthropicProvider
  }
};

/**
 * Mock model registry for testing
 */
export const mockModelRegistry = {
  getModelCapabilities: vi.fn().mockImplementation((modelId: string) => {
    if (modelId === 'claude-3-7-sonnet-20250219') {
      return {
        modelId: 'claude-3-7-sonnet-20250219',
        provider: 'anthropic',
        maxResponseTokens: 8192,
        defaultResponseTokens: 4096,
        supportsThinking: true,
        defaultThinkingBudget: 16000
      };
    } else if (modelId === 'gpt-4o') {
      return {
        modelId: 'gpt-4o',
        provider: 'openai',
        maxResponseTokens: 4096,
        defaultResponseTokens: 1024,
        supportsThinking: false
      };
    }
    throw new Error(`Model ${modelId} not found in registry`);
  }),
  
  validateResponseTokens: vi.fn().mockImplementation((modelId, tokens) => {
    if (modelId === 'claude-3-7-sonnet-20250219') {
      return Math.min(tokens || 4096, 8192);
    } else if (modelId === 'gpt-4o') {
      return Math.min(tokens || 1024, 4096);
    }
    return 1024; // Default fallback
  }),
  
  validateModelForProvider: vi.fn().mockImplementation((provider, modelId) => {
    if (provider === 'anthropic') {
      return modelId.startsWith('claude');
    } else if (provider === 'openai') {
      return modelId.startsWith('gpt');
    }
    return false;
  })
};

/**
 * Setup mock API modules
 */
export function setupMockAPIs() {
  vi.mock('@api/openai', () => ({
    submitOpenAICompletion: vi.fn().mockImplementation((endpoint, apiKey, request) => {
      // Return different responses based on capabilities in request
      if (request.thinking) {
        return Promise.resolve({
          choices: [{
            message: {
              content: "After thinking deeply, the answer is 42.",
              role: "assistant"
            },
            thinking: "Let me analyze this step by step..."
          }]
        });
      } else {
        return Promise.resolve({
          choices: [{
            message: {
              content: "The answer is 42.",
              role: "assistant"
            }
          }]
        });
      }
    }),
    
    submitOpenAIStreamingCompletion: vi.fn().mockImplementation(() => {
      // Return a mock readable stream
      return new ReadableStream({
        start(controller) {
          controller.enqueue({ content: "The answer " });
          controller.enqueue({ content: "is 42." });
          controller.close();
        }
      });
    })
  }));
  
  vi.mock('@api/anthropic', () => ({
    submitAnthropicCompletion: vi.fn().mockImplementation((endpoint, apiKey, request) => {
      // Return different responses based on capabilities in request
      if (request.thinking) {
        return Promise.resolve({
          content: "After careful consideration, I believe the answer is 42.",
          thinking: "I'll approach this systematically..."
        });
      } else {
        return Promise.resolve({
          content: "The answer is 42."
        });
      }
    }),
    
    submitAnthropicStreamingCompletion: vi.fn().mockImplementation(() => {
      // Return a mock readable stream
      return new ReadableStream({
        start(controller) {
          controller.enqueue({ content: "The answer " });
          controller.enqueue({ content: "is 42." });
          controller.close();
        }
      });
    })
  }));
}

/**
 * Setup all mocks for testing
 */
export function setupAllMocks() {
  // Setup mock APIs
  setupMockAPIs();
  
  // Mock provider registry
  vi.mock('@config/providers/provider.registry', () => ({
    ProviderRegistry: mockProviderRegistry
  }));
  
  // Mock model registry
  vi.mock('@config/models/model.registry', () => ({
    ModelRegistry: mockModelRegistry
  }));
  
  // Mock store
  vi.mock('@store/store', () => ({
    default: {
      getState: vi.fn().mockReturnValue({
        chats: [{
          id: 'test-chat-1',
          title: 'Test Chat',
          messages: [],
          config: {
            provider: 'openai',
            modelConfig: {
              model: 'gpt-4o',
              temperature: 0.7,
              capabilities: {
                thinking_mode: {
                  enabled: false,
                  budget_tokens: 16000
                }
              }
            }
          }
        }],
        currentChatIndex: 0,
        updateCapabilityConfig: vi.fn()
      }),
      setState: vi.fn()
    }
  }));
}