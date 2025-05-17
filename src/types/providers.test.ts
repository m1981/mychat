import { describe, it, expect, beforeEach } from 'vitest';
import { providers } from './providers';
import { ModelRegistry } from '@config/models/model.registry';
import { ProviderRegistry } from '@config/providers/provider.registry';
import { MessageInterface } from './chat';
import { RequestConfig } from './provider';

// Mock the registries
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

describe('Providers', () => {
  describe('OpenAI Provider', () => {
    const openaiProvider = providers.openai;
    let messages: MessageInterface[];
    let config: RequestConfig;

    beforeEach(() => {
      messages = [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Hello!' },
        { role: 'assistant', content: 'Hi there!' }
      ];
      
      config = {
        model: 'gpt-4o',
        max_tokens: 4096,
        temperature: 0.7,
        presence_penalty: 0,
        top_p: 1,
        frequency_penalty: 0,
        stream: true,
        enableThinking: false,
        thinkingConfig: {
          budget_tokens: 16000
        }
      };
    });

    it('should have correct provider properties', () => {
      expect(openaiProvider.id).toBe('openai');
      expect(openaiProvider.name).toBe('OpenAI');
      expect(openaiProvider.endpoints).toEqual(['https://api.openai.com']);
      expect(openaiProvider.models).toContain('gpt-4o');
    });

    it('should format request correctly', () => {
      const formattedRequest = openaiProvider.formatRequest(messages, config);
      
      expect(formattedRequest).toEqual({
        messages,
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

    it('should parse streaming response correctly', () => {
      const response = {
        choices: [
          {
            delta: {
              content: 'Streaming content'
            }
          }
        ]
      };
      
      const parsedResponse = openaiProvider.parseStreamingResponse(response);
      expect(parsedResponse).toBe('Streaming content');
    });

    it('should handle empty streaming response', () => {
      const response = {
        choices: [
          {
            delta: {}
          }
        ]
      };
      
      const parsedResponse = openaiProvider.parseStreamingResponse(response);
      expect(parsedResponse).toBe('');
    });

    it('should handle errors in streaming response parsing', () => {
      const response = null;
      
      const parsedResponse = openaiProvider.parseStreamingResponse(response);
      expect(parsedResponse).toBe('');
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
        enableThinking: true,
        thinkingConfig: {
          budget_tokens: 16000
        }
      };
    });

    it('should have correct provider properties', () => {
      expect(anthropicProvider.id).toBe('anthropic');
      expect(anthropicProvider.name).toBe('Anthropic');
      expect(anthropicProvider.endpoints).toEqual(['https://api.anthropic.com']);
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
      expect(formattedRequest.messages[0]).toEqual({
        role: 'user',
        content: 'Hello!'
      });
      
      expect(formattedRequest.messages[1]).toEqual({
        role: 'assistant',
        content: 'Hi there!'
      });
    });

    it('should format request correctly with thinking disabled', () => {
      const configWithoutThinking = {
        ...config,
        enableThinking: false
      };
      
      const formattedRequest = anthropicProvider.formatRequest(messages, configWithoutThinking);
      
      // Check that thinking is not included
      expect(formattedRequest.thinking).toBeUndefined();
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

    it('should handle errors in streaming response parsing', () => {
      const response = null;
      
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