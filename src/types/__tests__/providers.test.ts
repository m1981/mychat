import { providers } from '../providers';
import { describe, it, expect } from 'vitest';

describe('Anthropic Provider', () => {
  const anthropicProvider = providers.anthropic;

  describe('parseResponse', () => {
    it('should handle Claude 2 response format', () => {
      const response = { content: 'test response' };
      expect(anthropicProvider.parseResponse(response)).toBe('test response');
    });

    it('should handle Claude 3 response format', () => {
      const response = {
        content: [{ type: 'text', text: 'test response' }]
      };
      expect(anthropicProvider.parseResponse(response)).toBe('test response');
    });

    it('should handle empty or invalid responses', () => {
      expect(anthropicProvider.parseResponse(undefined)).toBe('');
      expect(anthropicProvider.parseResponse({})).toBe('');
      expect(anthropicProvider.parseResponse({ content: [] })).toBe('');
      expect(anthropicProvider.parseResponse({ content: [{ type: 'text' }] })).toBe('');
      expect(anthropicProvider.parseResponse({ content: null })).toBe('');
    });
  });

  describe('parseStreamingResponse', () => {
    it('should handle streaming content block delta', () => {
      const response = {
        type: 'content_block_delta',
        delta: { text: 'streaming text' }
      };
      expect(anthropicProvider.parseStreamingResponse(response)).toBe('streaming text');
    });

    it('should handle empty or invalid streaming responses', () => {
      expect(anthropicProvider.parseStreamingResponse({})).toBe('');
      expect(anthropicProvider.parseStreamingResponse({ type: 'wrong_type' })).toBe('');
      expect(anthropicProvider.parseStreamingResponse({ type: 'content_block_delta' })).toBe('');
      expect(anthropicProvider.parseStreamingResponse({ type: 'content_block_delta', delta: {} })).toBe('');
    });
  });
});