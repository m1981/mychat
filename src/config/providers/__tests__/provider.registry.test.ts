// src/config/providers/__tests__/provider.registry.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { ProviderRegistry } from '../provider.registry';
import { ProviderKey } from '@type/chat';

describe('ProviderRegistry', () => {
  describe('getDefaultModelForProvider', () => {
    it('should return claude-3-opus-latest for anthropic provider', () => {
      const model = ProviderRegistry.getDefaultModelForProvider('anthropic');
      expect(model).toBe('claude-3-opus-latest');
    });

    it('should return gpt-4 for openai provider', () => {
      const model = ProviderRegistry.getDefaultModelForProvider('openai');
      expect(model).toBe('gpt-4');
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
        'claude-3-opus-latest'
      );
      expect(isValid).toBe(true);
    });

    it('should return false for invalid anthropic model', () => {
      const isValid = ProviderRegistry.validateModelForProvider(
        'anthropic',
        'gpt-4'
      );
      expect(isValid).toBe(false);
    });
  });
});
