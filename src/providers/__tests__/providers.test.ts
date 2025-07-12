import { MessageInterface } from '@type/chat';
import { RequestConfig } from '@type/provider';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { AnthropicProvider } from '../AnthropicProvider';
import { OpenAIProvider } from '../OpenAIProvider';

// Mock fetch for testing
global.fetch = vi.fn();

describe('Provider Implementations', () => {
  // Reset mocks before each test
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  // Sample messages and config for testing
  const messages: MessageInterface[] = [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'Hello!' }
  ];

  const config: RequestConfig = {
    model: 'claude-3-7-sonnet-20250219',
    max_tokens: 4096,
    temperature: 0.7,
    top_p: 1,
    presence_penalty: 0,
    frequency_penalty: 0,
    stream: false
  };

  describe('AnthropicProvider', () => {
    let provider: AnthropicProvider;

    beforeEach(() => {
      provider = new AnthropicProvider();
    });

    it('should have correct provider properties', () => {
      expect(provider.id).toBe('anthropic');
      expect(provider.name).toBe('Anthropic');
      expect(provider.endpoints).toContain('/api/chat/anthropic');
      expect(provider.models).toContain('claude-3-7-sonnet-20250219');
    });

    it('should format request correctly', () => {
      const formattedRequest = provider.formatRequest(messages, config);
      
      expect(formattedRequest).toMatchObject({
        model: 'claude-3-7-sonnet-20250219',
        max_tokens: 4096,
        temperature: 0.7,
        stream: false,
        messages: [
          { role: 'user', content: 'Hello!' }
        ]
      });
    });

    it('should parse response correctly', () => {
      const mockResponse = {
        content: [{ text: 'Hello, how can I help you?' }]
      };
      
      const result = provider.parseResponse(mockResponse);
      expect(result).toBe('Hello, how can I help you?');
    });

    it('should parse streaming response correctly', () => {
      const mockStreamingResponse = {
        type: 'content_block_delta',
        delta: { text: 'Hello' }
      };
      
      const result = provider.parseStreamingResponse(mockStreamingResponse);
      expect(result).toBe('Hello');
    });
  });

  describe('OpenAIProvider', () => {
    let provider: OpenAIProvider;

    beforeEach(() => {
      provider = new OpenAIProvider();
    });

    it('should have correct provider properties', () => {
      expect(provider.id).toBe('openai');
      expect(provider.name).toBe('OpenAI');
      expect(provider.endpoints).toContain('/api/chat/openai');
      expect(provider.models).toContain('gpt-4o');
    });

    it('should format request correctly', () => {
      const openaiConfig = {
        ...config,
        model: 'gpt-4o'
      };
      
      const formattedRequest = provider.formatRequest(messages, openaiConfig);
      
      expect(formattedRequest).toMatchObject({
        model: 'gpt-4o',
        max_tokens: 4096,
        temperature: 0.7,
        top_p: 1,
        presence_penalty: 0,
        frequency_penalty: 0,
        stream: false,
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'Hello!' }
        ]
      });
    });

    it('should parse response correctly', () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'Hello, how can I help you?'
            }
          }
        ]
      };
      
      const result = provider.parseResponse(mockResponse);
      expect(result).toBe('Hello, how can I help you?');
    });

    it('should parse streaming response correctly', () => {
      const mockStreamingResponse = {
        choices: [
          {
            delta: {
              content: 'Hello'
            }
          }
        ]
      };
      
      const result = provider.parseStreamingResponse(mockStreamingResponse);
      expect(result).toBe('Hello');
    });
  });
});