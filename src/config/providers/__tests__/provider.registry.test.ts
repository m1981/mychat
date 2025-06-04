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
    })
  }
}));

// Import after mocking
import { ProviderRegistry } from '../provider.registry';

describe('ProviderRegistry', () => {
  describe('getDefaultModelForProvider', () => {
    it('should return claude-3-7-sonnet-20250219 for anthropic provider', () => {
      const model = ProviderRegistry.getDefaultModelForProvider('anthropic');
      expect(model).toBe('claude-3-7-sonnet-20250219');
    });

    it('should return gpt-4o for openai provider', () => {
      const model = ProviderRegistry.getDefaultModelForProvider('openai');
      expect(model).toBe('gpt-4o');
    });

    it('should throw error for invalid provider', () => {
      expect(() => {
        ProviderRegistry.getDefaultModelForProvider('invalid-provider' as ProviderKey);
      }).toThrow('Provider invalid-provider not found');
    });
  });

  describe('validateModelForProvider', () => {
    it('should return true for valid anthropic model', () => {
      const isValid = ProviderRegistry.validateModelForProvider(
        'anthropic',
        'claude-3-7-sonnet-20250219'
      );
      expect(isValid).toBe(true);
    });

    it('should return false for invalid anthropic model', () => {
      const isValid = ProviderRegistry.validateModelForProvider(
        'anthropic',
        'gpt-4o'
      );
      expect(isValid).toBe(false);
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