// src/config/providers/__tests__/provider.registry.test.ts
import { describe, it, expect } from 'vitest';
import { ProviderRegistry } from '../provider.registry';

describe('ProviderRegistry', () => {
  describe('getDefaultModelForProvider', () => {
    it('should return claude-3-5-sonnet-20241022 for anthropic provider', () => {
      const model = ProviderRegistry.getDefaultModelForProvider('anthropic');
      expect(model).toBe('claude-3-5-sonnet-20241022');
    });

    it('should return gpt-4 for openai provider', () => {
      const model = ProviderRegistry.getDefaultModelForProvider('openai');
      expect(model).toBe('gpt-4o');
    });

    it('should throw error for invalid provider', () => {
      // TypeScript will catch this at compile time, but we test runtime behavior
      expect(() => {
        // @ts-expect-error - Testing invalid provider
        ProviderRegistry.getDefaultModelForProvider('invalid-provider');
      }).toThrow('Provider invalid-provider not found');
    });
  });

  describe('validateModelForProvider', () => {
    it('should return true for valid anthropic model', () => {
      const isValid = ProviderRegistry.validateModelForProvider(
        'anthropic',
        'claude-3-5-sonnet-20241022'
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
});
