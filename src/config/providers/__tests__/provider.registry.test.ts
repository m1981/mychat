// src/config/providers/__tests__/provider.registry.test.ts
import { ProviderKey } from '@type/chat';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock ModelRegistry before importing modules that use it
vi.mock('@config/models/model.registry', () => ({
  ModelRegistry: {
    getModelCapabilities: vi.fn().mockReturnValue({
      modelId: 'claude-3-7-sonnet-20250219',
      provider: 'anthropic',
      maxResponseTokens: 8192,
      defaultResponseTokens: 4096,
      supportsThinking: true,
      defaultThinkingBudget: 16000
    }),
    getModelsForProvider: vi.fn().mockImplementation((provider) => {
      if (provider === 'anthropic') {
        return ['claude-3-7-sonnet-20250219'];
      } else if (provider === 'openai') {
        return ['gpt-4o'];
      }
      return [];
    }),
    isModelSupported: vi.fn().mockImplementation((modelId) => {
      return ['claude-3-7-sonnet-20250219', 'gpt-4o'].includes(modelId);
    })
  }
}));

// Import after mocking
import { ProviderRegistry } from '../provider.registry';

describe('ProviderRegistry', () => {
  // Reset mocks before each test
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getProvider', () => {
    it('should return the correct provider implementation for anthropic', () => {
      const provider = ProviderRegistry.getProvider('anthropic');
      expect(provider.id).toBe('anthropic');
      expect(provider.name).toBe('Anthropic');
    });

    it('should return the correct provider implementation for openai', () => {
      const provider = ProviderRegistry.getProvider('openai');
      expect(provider.id).toBe('openai');
      expect(provider.name).toBe('OpenAI');
    });

    it('should return default provider when invalid provider key is given', () => {
      const provider = ProviderRegistry.getProvider('invalid-provider' as ProviderKey);
      // Default provider should be returned (assuming anthropic is default)
      expect(provider.id).toBe('anthropic');
    });
  });

  describe('getAvailableProviders', () => {
    it('should return all available provider keys', () => {
      const providers = ProviderRegistry.getAvailableProviders();
      expect(providers).toContain('anthropic');
      expect(providers).toContain('openai');
      expect(providers.length).toBe(2);
    });
  });

  describe('hasProvider', () => {
    it('should return true for valid providers', () => {
      expect(ProviderRegistry.hasProvider('anthropic')).toBe(true);
      expect(ProviderRegistry.hasProvider('openai')).toBe(true);
    });

    it('should return false for invalid providers', () => {
      expect(ProviderRegistry.hasProvider('invalid-provider' as ProviderKey)).toBe(false);
    });
  });

  describe('getProviderConfig', () => {
    it('should return correct config for anthropic provider', () => {
      const config = ProviderRegistry.getProviderConfig('anthropic');
      expect(config.name).toBe('Anthropic');
      expect(config.defaultModel).toBe('claude-3-7-sonnet-20250219');
    });

    it('should return correct config for openai provider', () => {
      const config = ProviderRegistry.getProviderConfig('openai');
      expect(config.name).toBe('OpenAI');
      expect(config.defaultModel).toBe('gpt-4o');
    });
  });

  describe('getProviderCapabilities', () => {
    it('should return correct capabilities for anthropic provider', () => {
      const capabilities = ProviderRegistry.getProviderCapabilities('anthropic');
      expect(capabilities).toEqual({
        supportsThinking: true,
        defaultThinkingModel: 'claude-3-7-sonnet-20250219',
        maxCompletionTokens: 8192,
        defaultModel: 'claude-3-7-sonnet-20250219'
      });
    });

    it('should return correct capabilities for openai provider', () => {
      const capabilities = ProviderRegistry.getProviderCapabilities('openai');
      expect(capabilities).toEqual({
        supportsThinking: false,
        maxCompletionTokens: 16384,
        defaultModel: 'gpt-4o'
      });
    });
  });
});