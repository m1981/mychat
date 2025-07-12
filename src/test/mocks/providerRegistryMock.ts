import { vi } from 'vitest';

/**
 * Creates a mock for the ProviderRegistry
 * 
 * IMPORTANT: This function must be used directly in vi.mock, not imported and then used,
 * due to Vitest's hoisting behavior.
 * 
 * Example usage:
 * 
 * ```
 * // Correct usage - inline in vi.mock
 * vi.mock('@config/providers/provider.registry', () => ({
 *   ProviderRegistry: {
 *     getProvider: vi.fn().mockImplementation((key) => {
 *       if (key === 'anthropic') {
 *         return {
 *           id: 'anthropic',
 *           name: 'Anthropic',
 *           // other properties...
 *         };
 *       }
 *       return {
 *         id: 'openai',
 *         name: 'OpenAI',
 *         // other properties...
 *       };
 *     }),
 *     // other methods...
 *   }
 * }));
 * ```
 */

// Mock stream implementation for tests
const createMockStream = () => {
  return {
    getReader: () => ({
      read: vi.fn().mockResolvedValueOnce({
        value: new Uint8Array([116, 101, 115, 116]), // "test" in UTF-8
        done: false
      }).mockResolvedValueOnce({
        done: true
      })
    })
  };
};

// Define mock providers that can be used in tests
export const mockAnthropicProvider = {
  id: 'anthropic',
  name: 'Anthropic',
  endpoints: ['/api/chat/anthropic'],
  capabilities: {
    supportsThinking: true,
    maxCompletionTokens: 8192,
    defaultModel: 'claude-3-7-sonnet-20250219',
    defaultThinkingModel: 'claude-3-7-sonnet-20250219'
  },
  models: [
    {
      id: 'claude-3-7-sonnet-20250219',
      name: 'Claude 3.7 Sonnet',
      maxCompletionTokens: 8192,
      cost: {
        input: { price: 0.003, unit: 1000 },
        output: { price: 0.015, unit: 1000 }
      }
    }
  ],
  formatRequest: vi.fn().mockImplementation((messages, config) => ({
    messages,
    model: config.model,
    max_tokens: config.max_tokens,
    temperature: config.temperature,
    stream: config.stream
  })),
  parseResponse: vi.fn().mockImplementation((response) => ({
    content: response.content || '',
    role: 'assistant'
  })),
  parseStreamingResponse: vi.fn().mockReturnValue('Mocked streaming response'),
  submitCompletion: vi.fn().mockResolvedValue({ content: 'Mocked completion response' }),
  submitStream: vi.fn().mockResolvedValue(createMockStream())
};

export const mockOpenAIProvider = {
  id: 'openai',
  name: 'OpenAI',
  endpoints: ['/api/chat/openai'],
  capabilities: {
    supportsThinking: false,
    maxCompletionTokens: 16384,
    defaultModel: 'gpt-4o'
  },
  models: [
    {
      id: 'gpt-4o',
      name: 'GPT-4o',
      maxCompletionTokens: 16384,
      cost: {
        input: { price: 0.0025, unit: 1000 },
        output: { price: 0.01, unit: 1000 }
      }
    }
  ],
  formatRequest: vi.fn().mockImplementation((messages, config) => ({
    messages: messages.map(m => ({ role: m.role, content: m.content })),
    model: config.model,
    max_tokens: config.max_tokens,
    temperature: config.temperature,
    presence_penalty: config.presence_penalty,
    top_p: config.top_p,
    frequency_penalty: config.frequency_penalty,
    stream: config.stream
  })),
  parseResponse: vi.fn().mockImplementation((response) => ({
    content: response.choices?.[0]?.message?.content || '',
    role: 'assistant'
  })),
  parseStreamingResponse: vi.fn().mockReturnValue('Mocked streaming response'),
  submitCompletion: vi.fn().mockResolvedValue({ 
    choices: [{ message: { content: 'Mocked OpenAI response' } }] 
  }),
  submitStream: vi.fn().mockResolvedValue(createMockStream())
};

// Define mock provider configs
export const mockProviderConfigs = {
  anthropic: {
    id: 'anthropic',
    name: 'Anthropic',
    defaultModel: 'claude-3-7-sonnet-20250219',
    endpoints: ['/api/chat/anthropic'],
    models: [
      {
        id: 'claude-3-7-sonnet-20250219',
        name: 'Claude 3.7 Sonnet',
        maxCompletionTokens: 8192,
        cost: {
          input: { price: 0.003, unit: 1000 },
          output: { price: 0.015, unit: 1000 }
        }
      }
    ],
    capabilities: {
      supportsThinking: true,
      supportsFileUpload: false
    }
  },
  openai: {
    id: 'openai',
    name: 'OpenAI',
    defaultModel: 'gpt-4o',
    endpoints: ['/api/chat/openai'],
    models: [
      {
        id: 'gpt-4o',
        name: 'GPT-4o',
        maxCompletionTokens: 16384,
        cost: {
          input: { price: 0.0025, unit: 1000 },
          output: { price: 0.01, unit: 1000 }
        }
      }
    ],
    capabilities: {
      supportsThinking: false,
      supportsFileUpload: true
    }
  }
};