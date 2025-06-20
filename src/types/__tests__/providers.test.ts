import { describe, it, expect, vi, beforeEach } from 'vitest';
import { providers } from '@type/providers';
import { MessageInterface } from '@type/chat';
import { RequestConfig } from '@type/provider';
import { ModelRegistry } from '@config/models/model.registry';
import { ProviderRegistry } from '@config/providers/provider.registry';

// Mock dependencies
vi.mock('@store/store', () => ({
  default: {
    getState: () => ({
      apiKeys: {
        openai: 'mock-openai-key',
        anthropic: 'mock-anthropic-key'
      }
    })
  }
}));

vi.mock('@config/models/model.registry', () => ({
  ModelRegistry: {
    getModelCapabilities: vi.fn().mockReturnValue({
      maxResponseTokens: 4096
    })
  }
}));

vi.mock('@config/providers/provider.registry', () => ({
  ProviderRegistry: {
    getProvider: vi.fn().mockImplementation((provider) => {
      if (provider === 'openai') {
        return {
          name: 'OpenAI',
          endpoints: ['https://api.openai.com'],
          models: [{ id: 'gpt-4o' }],
          defaultModel: 'gpt-4o'
        };
      } else if (provider === 'anthropic') {
        return {
          name: 'Anthropic',
          endpoints: ['https://api.anthropic.com'],
          models: [{ id: 'claude-3-7-sonnet-20250219' }],
          defaultModel: 'claude-3-7-sonnet-20250219'
        };
      }
      return {};
    })
  }
}));

// Mock fetch
global.fetch = vi.fn().mockImplementation(() => 
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
    body: {
      getReader: () => ({
        read: vi.fn().mockResolvedValueOnce({
          value: new TextEncoder().encode('data: {"choices":[{"delta":{"content":"Test"}}]}'),
          done: false
        }).mockResolvedValueOnce({
          done: true
        })
      })
    } as any
  })
);

describe('Providers', () => {
  describe('OpenAI Provider', () => {
    const openaiProvider = providers.openai;
    let messages: MessageInterface[];
    let config: RequestConfig;

    beforeEach(() => {
      vi.clearAllMocks();
      
      // Reset the fetch mock for each test
      global.fetch = vi.fn().mockImplementation(() => 
        Promise.resolve({
          ok: true,
          status: 200,
          text: () => Promise.resolve(""),
          json: () => Promise.resolve({}),
          body: {
            getReader: () => ({
              read: vi.fn().mockResolvedValueOnce({
                value: new TextEncoder().encode('data: {"choices":[{"delta":{"content":"Test"}}]}'),
                done: false
              }).mockResolvedValueOnce({
                done: true
              })
            })
          } as any
        })
      );
      
      messages = [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Hello!' }
      ];
      
      config = {
        model: 'gpt-4o',
        max_tokens: 4096,
        temperature: 0.7,
        presence_penalty: 0,
        top_p: 1,
        frequency_penalty: 0,
        stream: true
      };
    });

    it('should have correct provider properties', () => {
      expect(openaiProvider.id).toBe('openai');
      expect(openaiProvider.name).toBe('OpenAI');
      expect(openaiProvider.endpoints).toEqual(['/api/chat/openai']);
      expect(openaiProvider.models).toContain('gpt-4o');
    });

    it('should format request correctly', () => {
      const formattedRequest = openaiProvider.formatRequest(messages, config);
      
      expect(formattedRequest).toEqual({
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'Hello!' }
        ],
        model: 'gpt-4o',
        max_tokens: 4096,
        temperature: 0.7,
        presence_penalty: 0,
        top_p: 1,
        frequency_penalty: 0,
        stream: true
      });
    });

    it('should parse response correctly', () => {
      const response = {
        choices: [
          {
            message: {
              content: 'This is a test response.'
            }
          }
        ]
      };
      
      const parsedResponse = openaiProvider.parseResponse(response);
      expect(parsedResponse).toBe('This is a test response.');
    });

    it('should parse direct content response (used in tests)', () => {
      const response = {
        content: 'This is a direct content response.'
      };
      
      const parsedResponse = openaiProvider.parseResponse(response);
      expect(parsedResponse).toBe('This is a direct content response.');
    });

    it('should throw error for invalid response format', () => {
      const response = { invalid: 'format' };
      
      expect(() => openaiProvider.parseResponse(response)).toThrow('Invalid response format from OpenAI');
    });

    it('should submit completion request correctly', async () => {
      const formattedRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
        model: 'gpt-4o',
        max_tokens: 1000,
        temperature: 0.7,
        top_p: 1,
        stream: false
      };
      
      await openaiProvider.submitCompletion(formattedRequest);
      
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/chat/openai',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            ...formattedRequest,  // Spread parameters at top level
            apiKey: 'mock-openai-key'
          })
        }
      );
    });
    
    it('should submit stream request correctly', async () => {
      const formattedRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
        model: 'gpt-4o',
        max_tokens: 1000,
        temperature: 0.7,
        top_p: 1,
        stream: false
      };
      
      const stream =  await openaiProvider.submitStream(formattedRequest);
      
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/chat/openai',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock-openai-key'
          },
          body: JSON.stringify({...formattedRequest, stream: true})
        }
      );
      
      expect(stream).toBeDefined();
    });

    it('should filter out empty messages', () => {
      const messagesWithEmpty = [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Hello!' },
        { role: 'assistant', content: '' }, // Empty message that should be filtered
        { role: 'user', content: '   ' }    // Whitespace-only message that should be filtered
      ];
      
      const formattedRequest = openaiProvider.formatRequest(messagesWithEmpty, config);
      
      // Check that empty messages are filtered out
      expect(formattedRequest.messages.length).toBe(2);
      expect(formattedRequest.messages[0]).toEqual({
        role: 'system',
        content: 'You are a helpful assistant.'
      });
      expect(formattedRequest.messages[1]).toEqual({
        role: 'user',
        content: 'Hello!'
      });
    });
  });

  describe('Anthropic Provider', () => {
    const anthropicProvider = providers.anthropic;
    let messages: MessageInterface[];
    let config: RequestConfig;

    beforeEach(() => {
      vi.clearAllMocks();
      
      // Reset the fetch mock for each test
      global.fetch = vi.fn().mockImplementation(() => 
        Promise.resolve({
          ok: true,
          status: 200,
          text: () => Promise.resolve(""),
          json: () => Promise.resolve({}),
          body: {
            getReader: () => ({
              read: vi.fn().mockResolvedValueOnce({
                value: new TextEncoder().encode('data: {"choices":[{"delta":{"content":"Test"}}]}'),
                done: false
              }).mockResolvedValueOnce({
                done: true
              })
            })
          } as any
        })
      );
      
      messages = [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Hello!' },
        { role: 'assistant', content: 'Hi there!' }
      ];
      
      config = {
        model: 'claude-3-7-sonnet-20250219',
        max_tokens: 4096,
        temperature: 0.7,
        presence_penalty: 0,
        top_p: 1,
        frequency_penalty: 0,
        stream: true,
        thinking_mode: {
          enabled: true,
          budget_tokens: 16000
        }
      };
    });

    it('should have correct provider properties', () => {
      expect(anthropicProvider.id).toBe('anthropic');
      expect(anthropicProvider.name).toBe('Anthropic');
      expect(anthropicProvider.endpoints).toEqual(['/api/chat/anthropic']);
      expect(anthropicProvider.models).toContain('claude-3-7-sonnet-20250219');
    });

    it('should format request correctly with system message', () => {
      const formattedRequest = anthropicProvider.formatRequest(messages, config);
      
      // Check that system message is properly handled as a system parameter
      expect(formattedRequest.system).toBe('You are a helpful assistant.');
      
      // Check that system message is not included in the messages array
      expect(formattedRequest.messages.length).toBe(2);
      
      // Check that regular messages are included
      expect(formattedRequest.messages[0]).toEqual({
        role: 'user',
        content: 'Hello!'
      });
      
      expect(formattedRequest.messages[1]).toEqual({
        role: 'assistant',
        content: 'Hi there!'
      });
      
      // Check other request parameters
      expect(formattedRequest.model).toBe('claude-3-7-sonnet-20250219');
      expect(formattedRequest.max_tokens).toBe(4096);
      expect(formattedRequest.temperature).toBe(0.7);
      expect(formattedRequest.top_p).toBe(1);
      expect(formattedRequest.stream).toBe(true);
      expect(formattedRequest.thinking).toEqual({
        type: 'enabled',
        budget_tokens: 16000
      });
    });

    it('should format request correctly without system message', () => {
      const messagesWithoutSystem = [
        { role: 'user', content: 'Hello!' },
        { role: 'assistant', content: 'Hi there!' }
      ];
      
      const formattedRequest = anthropicProvider.formatRequest(messagesWithoutSystem, config);
      
      // Check that no system parameter is added
      expect(formattedRequest.system).toBeUndefined();
      
      // Check that regular messages are included
      expect(formattedRequest.messages.length).toBe(2);
      expect(formattedRequest.messages[0]).toEqual({
        role: 'user',
        content: 'Hello!'
      });
      
      expect(formattedRequest.messages[1]).toEqual({
        role: 'assistant',
        content: 'Hi there!'
      });
    });

    it('should submit completion request correctly', async () => {
      const formattedRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
        model: 'claude-3-7-sonnet-20250219',
        max_tokens: 1000,
        temperature: 0.7,
        top_p: 1,
        stream: false
      };
      
      await anthropicProvider.submitCompletion(formattedRequest);
      
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/chat/anthropic',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            ...formattedRequest,  // Spread parameters at top level
            apiKey: 'mock-anthropic-key'
          })
        }
      );
    });

    it('should parse response correctly with content array', () => {
      const response = {
        content: [{ text: 'This is a test response.' }]
      };
      
      const parsedResponse = anthropicProvider.parseResponse(response);
      expect(parsedResponse).toBe('This is a test response.');
    });

    it('should parse response correctly with string content', () => {
      const response = {
        content: 'This is a direct content response.'
      };
      
      const parsedResponse = anthropicProvider.parseResponse(response);
      expect(parsedResponse).toBe('This is a direct content response.');
    });

    it('should handle empty response', () => {
      const response = {};
      
      const parsedResponse = anthropicProvider.parseResponse(response);
      expect(parsedResponse).toBe('');
    });

    it('should parse streaming response correctly', () => {
      const response = {
        type: 'content_block_delta',
        delta: { text: 'Streaming content' }
      };
      
      const parsedResponse = anthropicProvider.parseStreamingResponse(response);
      expect(parsedResponse).toBe('Streaming content');
    });

    it('should handle non-content-block-delta streaming response', () => {
      const response = {
        type: 'message_start'
      };
      
      const parsedResponse = anthropicProvider.parseStreamingResponse(response);
      expect(parsedResponse).toBe('');
    });

    it('should filter out empty messages', () => {
      const messagesWithEmpty = [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Hello!' },
        { role: 'assistant', content: '' }, // Empty message that should be filtered
        { role: 'user', content: '   ' }    // Whitespace-only message that should be filtered
      ];
      
      const formattedRequest = anthropicProvider.formatRequest(messagesWithEmpty, config);
      
      // Check that empty messages are filtered out
      expect(formattedRequest.messages.length).toBe(1);
      expect(formattedRequest.messages[0]).toEqual({
        role: 'user',
        content: 'Hello!'
      });
    });
  });

  describe('Type Tests', () => {
    it('should validate provider types match expected interfaces', () => {
      // This is a type-level test, just ensuring the providers object has the correct shape
      expect(typeof providers.openai.formatRequest).toBe('function');
      expect(typeof providers.openai.parseResponse).toBe('function');
      expect(typeof providers.openai.parseStreamingResponse).toBe('function');
      
      expect(typeof providers.anthropic.formatRequest).toBe('function');
      expect(typeof providers.anthropic.parseResponse).toBe('function');
      expect(typeof providers.anthropic.parseStreamingResponse).toBe('function');
    });
  });
});