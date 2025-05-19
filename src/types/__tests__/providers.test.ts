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
      maxResponseTokens: 1000
    })
  }
}));

vi.mock('@config/providers/provider.registry', () => ({
  ProviderRegistry: {
    getProvider: vi.fn().mockImplementation((key) => {
      if (key === 'openai') {
        return {
          name: 'OpenAI',
          endpoints: ['/api/chat/openai'],
          models: []
        };
      }
      if (key === 'anthropic') {
        return {
          name: 'Anthropic',
          endpoints: ['/api/chat/anthropic'],
          models: []
        };
      }
      return null;
    })
  }
}));

// Mock fetch
global.fetch = vi.fn();

describe('Provider Implementations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup fetch mock
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ 
        choices: [{ message: { content: 'Test response' } }] 
      }),
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
    });
  });

  describe('OpenAI Provider', () => {
    const openaiProvider = providers.openai;
    
    it('should format request correctly', () => {
      const messages: MessageInterface[] = [
        { id: '1', role: 'system', content: 'You are a helpful assistant' },
        { id: '2', role: 'user', content: 'Hello' }
      ];
      
      const config: RequestConfig = {
        model: 'gpt-4o',
        temperature: 0.7,
        top_p: 1,
        max_tokens: 1000,
        presence_penalty: 0,
        frequency_penalty: 0
      };
      
      const result = openaiProvider.formatRequest(config, messages);
      
      expect(result).toEqual({
        messages: [
          { role: 'system', content: 'You are a helpful assistant' },
          { role: 'user', content: 'Hello' }
        ],
        model: 'gpt-4o',
        max_tokens: 1000,
        temperature: 0.7,
        presence_penalty: 0,
        top_p: 1,
        frequency_penalty: 0,
        stream: false
      });
    });
    
    it('should parse response correctly', () => {
      const response = {
        choices: [
          {
            message: {
              content: 'Hello, how can I help you?'
            }
          }
        ]
      };
      
      const result = openaiProvider.parseResponse(response);
      
      expect(result).toBe('Hello, how can I help you?');
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
        expect.stringContaining('/api/chat/openai'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock-openai-key'
          }),
          body: JSON.stringify(formattedRequest)
        })
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
      
      const stream = await openaiProvider.submitStream(formattedRequest);
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/chat/openai'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock-openai-key'
          }),
          body: JSON.stringify({...formattedRequest, stream: true})
        })
      );
      
      expect(stream).toBeDefined();
    });
  });
  
  describe('Anthropic Provider', () => {
    const anthropicProvider = providers.anthropic;
    
    it('should format request correctly with system message', () => {
      const messages: MessageInterface[] = [
        { id: '1', role: 'system', content: 'You are Claude' },
        { id: '2', role: 'user', content: 'Hello' }
      ];
      
      const config: RequestConfig = {
        model: 'claude-3-7-sonnet-20250219',
        temperature: 0.7,
        top_p: 1,
        max_tokens: 1000,
        thinking_mode: {
          enabled: true,
          budget_tokens: 500
        }
      };
      
      const result = anthropicProvider.formatRequest(config, messages);
      
      expect(result).toEqual({
        model: 'claude-3-7-sonnet-20250219',
        max_tokens: 1000,
        temperature: 0.7,
        top_p: 1,
        stream: false,
        thinking: {
          type: 'enabled',
          budget_tokens: 500
        },
        system: 'You are Claude',
        messages: [
          { role: 'user', content: 'Hello' }
        ]
      });
    });
    
    it('should parse response correctly', () => {
      const response = {
        content: [
          {
            text: 'Hello, I am Claude. How can I assist you today?'
          }
        ]
      };
      
      const result = anthropicProvider.parseResponse(response);
      
      expect(result).toBe('Hello, I am Claude. How can I assist you today?');
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
        expect.stringContaining('/api/chat/anthropic'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'x-api-key': 'mock-anthropic-key',
            'anthropic-version': '2023-06-01'
          }),
          body: JSON.stringify(formattedRequest)
        })
      );
    });
  });
});