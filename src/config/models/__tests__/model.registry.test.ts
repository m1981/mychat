// src/config/models/__tests__/model.registry.test.ts
import { describe, it, expect } from 'vitest';
import { ModelRegistry } from '../model.registry';

describe('ModelRegistry', () => {
  describe('getModelCapabilities', () => {
    it('should return capabilities for claude model', () => {
      const capabilities = ModelRegistry.getModelCapabilities('claude-3-7-sonnet-20250219');
      expect(capabilities.provider).toBe('anthropic');
      expect(capabilities.maxResponseTokens).toBe(8192);
    });

    it('should return capabilities for gpt model', () => {
      const capabilities = ModelRegistry.getModelCapabilities('gpt-4o');
      expect(capabilities.provider).toBe('openai');
      expect(capabilities.maxResponseTokens).toBe(4096);
    });

    it('should throw error for invalid model', () => {
      expect(() => {
        ModelRegistry.getModelCapabilities('invalid-model');
      }).toThrow('Model invalid-model not found in registry');
    });
  });

  describe('validateResponseTokens', () => {
    it('should return default tokens when no tokens specified', () => {
      const tokens = ModelRegistry.validateResponseTokens('claude-3-7-sonnet-20250219');
      expect(tokens).toBe(4096);
    });

    it('should return requested tokens when within limits', () => {
      const tokens = ModelRegistry.validateResponseTokens('claude-3-7-sonnet-20250219', 4000);
      expect(tokens).toBe(4000);
    });

    it('should cap tokens at model maximum', () => {
      const tokens = ModelRegistry.validateResponseTokens('claude-3-7-sonnet-20250219', 10000);
      expect(tokens).toBe(8192);
    });
  });
});
