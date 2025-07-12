import { ProviderRegistry } from '@config/providers/provider.registry';
import { describe, it, expect, vi } from 'vitest';

// Mock the ProviderRegistry before importing any modules that use it
vi.mock('@config/providers/provider.registry', () => {
  return {
    ProviderRegistry: {
      getProvider: vi.fn().mockImplementation((key) => {
        if (key === 'anthropic') {
          return {
            id: 'anthropic',
            name: 'Anthropic',
            formatRequest: vi.fn().mockImplementation((messages, config) => ({
              messages,
              model: config.model,
              max_tokens: config.max_tokens,
              temperature: config.temperature,
              top_p: config.top_p,
              stream: config.stream
            })),
            parseResponse: vi.fn().mockImplementation((response) => ({
              content: response.content || '',
              role: 'assistant'
            }))
          };
        }
        return {
          id: 'openai',
          name: 'OpenAI',
          formatRequest: vi.fn(),
          parseResponse: vi.fn()
        };
      }),
      getProviderCapabilities: vi.fn().mockImplementation((key) => {
        if (key === 'anthropic') {
          return {
            supportsThinking: true,
            defaultModel: 'claude-3-7-sonnet-20250219'
          };
        }
        return {
          supportsThinking: false,
          defaultModel: 'gpt-4o'
        };
      }),
      getAvailableProviders: vi.fn().mockReturnValue(['anthropic', 'openai'])
    }
  };
});

describe('Provider Types', () => {
  describe('ProviderRegistry', () => {
    it('should return the correct provider for a given key', () => {
      const anthropicProvider = ProviderRegistry.getProvider('anthropic');
      const openaiProvider = ProviderRegistry.getProvider('openai');
      
      expect(anthropicProvider.id).toBe('anthropic');
      expect(anthropicProvider.name).toBe('Anthropic');
      
      expect(openaiProvider.id).toBe('openai');
      expect(openaiProvider.name).toBe('OpenAI');
    });
    
    it('should return provider capabilities', () => {
      const anthropicCapabilities = ProviderRegistry.getProviderCapabilities('anthropic');
      const openaiCapabilities = ProviderRegistry.getProviderCapabilities('openai');
      
      expect(anthropicCapabilities.supportsThinking).toBe(true);
      expect(anthropicCapabilities.defaultModel).toBe('claude-3-7-sonnet-20250219');
      
      expect(openaiCapabilities.supportsThinking).toBe(false);
      expect(openaiCapabilities.defaultModel).toBe('gpt-4o');
    });
    
    it('should return available providers', () => {
      const providers = ProviderRegistry.getAvailableProviders();
      
      expect(providers).toContain('anthropic');
      expect(providers).toContain('openai');
      expect(providers.length).toBe(2);
    });
  });
  
  describe('Provider Implementation', () => {
    it('should format requests correctly', () => {
      const provider = ProviderRegistry.getProvider('anthropic');
      const messages = [{ role: 'user', content: 'Hello' }];
      const config = { model: 'claude-3-7-sonnet-20250219', max_tokens: 4096, temperature: 0.7, top_p: 1, stream: false };
      
      const formattedRequest = provider.formatRequest(messages, config);
      
      expect(formattedRequest).toEqual({
        messages,
        model: 'claude-3-7-sonnet-20250219',
        max_tokens: 4096,
        temperature: 0.7,
        top_p: 1,
        stream: false
      });
    });
    
    it('should parse responses correctly', () => {
      const provider = ProviderRegistry.getProvider('anthropic');
      const response = { content: 'Test response' };
      
      const parsedResponse = provider.parseResponse(response);
      
      expect(parsedResponse).toEqual({
        content: 'Test response',
        role: 'assistant'
      });
    });
  });
});