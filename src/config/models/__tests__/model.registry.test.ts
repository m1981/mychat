// src/config/models/__tests__/model.registry.test.ts
import { describe, it, expect } from 'vitest';
import { ModelRegistry } from '../model.registry';

describe('ModelRegistry', () => {
  describe('getModelCapabilities', () => {
    it('should return correct capabilities for Claude 3 Opus', () => {
      const capabilities = ModelRegistry.getModelCapabilities('claude-3-opus-latest');

      expect(capabilities).toEqual({
        modelId: 'claude-3-opus-latest',
        provider: 'anthropic',
        contextWindow: 200000,
        maxResponseTokens: 4096,
        defaultResponseTokens: 1024
      });
    });

    it('should throw error for invalid model', () => {
      expect(() => {
        ModelRegistry.getModelCapabilities('invalid-model');
      }).toThrow('Model invalid-model not found in registry');
    });
  });

  describe('validateResponseTokens', () => {
    it('should return default tokens when no tokens specified', () => {
      const tokens = ModelRegistry.validateResponseTokens('claude-3-opus-latest');
      expect(tokens).toBe(1024);
    });

    it('should return requested tokens when within limits', () => {
      const tokens = ModelRegistry.validateResponseTokens('claude-3-opus-latest', 2000);
      expect(tokens).toBe(2000);
    });

    it('should cap tokens at model maximum', () => {
      const tokens = ModelRegistry.validateResponseTokens('claude-3-opus-latest', 5000);
      expect(tokens).toBe(4096);
    });
  });
});
