// src/config/providers/__tests__/provider.registry.test.ts
import { ProviderKey } from '@type/chat';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Import the actual implementation
import { ProviderRegistry } from '../provider.registry';
import { PROVIDER_CONFIGS } from '../provider.config';

// Mock ModelRegistry
vi.mock('@config/models/model.registry', () => ({
  ModelRegistry: {
    getModelCapabilities: vi.fn().mockImplementation((modelId) => {
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
      return null;
    }),
    validateModelForProvider: vi.fn().mockImplementation((provider, modelId) => {
      if (provider === 'anthropic') {
        return modelId === 'claude-3-7-sonnet-20250219';
      } else if (provider === 'openai') {
        return modelId === 'gpt-4o';
      }
      return false;
    })
  }
}));

describe('ProviderRegistry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getProviders', () => {
    it('should return all provider configs', () => {
      const providers = ProviderRegistry.getProviders();
      // Test that it returns the actual PROVIDER_CONFIGS
      expect(providers).toBe(PROVIDER_CONFIGS);
      // Verify some expected providers exist
      expect(providers.anthropic).toBeDefined();
      expect(providers.openai).toBeDefined();
    });
  });

  describe('getProvider', () => {
    it('should return the correct provider config for a valid key', () => {
      const provider = ProviderRegistry.getProvider('anthropic');
      expect(provider).toBe(PROVIDER_CONFIGS.anthropic);
      expect(provider.id).toBe('anthropic');
      expect(provider.name).toBe('Anthropic');
    });

    it('should throw an error for a null/undefined key', () => {
      expect(() => {
        // @ts-ignore - Testing runtime behavior with invalid input
        ProviderRegistry.getProvider(null);
      }).toThrow('Provider key is required');
    });

    it('should throw an error for an invalid provider key', () => {
      expect(() => {
        ProviderRegistry.getProvider('invalid-provider' as ProviderKey);
      }).toThrow('Provider "invalid-provider" not found');
    });
  });





  describe('getProviderCapabilities', () => {
    it('should return correct capabilities for anthropic provider', () => {
      const capabilities = ProviderRegistry.getProviderCapabilities('anthropic');
      expect(capabilities).toEqual(PROVIDER_CONFIGS.anthropic.capabilities);
      expect(capabilities.supportsThinking).toBe(true);
      expect(capabilities.defaultModel).toBe('claude-3-7-sonnet-20250219');
    });

    it('should return correct capabilities for openai provider', () => {
      const capabilities = ProviderRegistry.getProviderCapabilities('openai');
      expect(capabilities).toEqual(PROVIDER_CONFIGS.openai.capabilities);
      expect(capabilities.supportsThinking).toBe(false);
      expect(capabilities.defaultModel).toBe('gpt-4o');
    });

    it('should throw error for invalid provider', () => {
      expect(() => {
        ProviderRegistry.getProviderCapabilities('invalid-provider' as ProviderKey);
      }).toThrow('Provider "invalid-provider" not found');
    });
  });

  describe('providers getter', () => {
    it('should return all provider configs', () => {
      const providers = ProviderRegistry.providers;
      expect(providers).toBe(PROVIDER_CONFIGS);
      expect(providers.anthropic).toBeDefined();
      expect(providers.openai).toBeDefined();
    });
  });
});