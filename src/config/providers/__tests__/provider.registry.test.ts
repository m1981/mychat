// src/config/providers/__tests__/provider.registry.test.ts
import { describe, it, expect } from 'vitest';
import { ProviderRegistry } from '../provider.registry';
import { ProviderKey } from '@type/chat';

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