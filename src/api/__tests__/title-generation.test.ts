import { describe, it, expect, beforeEach } from 'vitest';
import { generateTitle } from '../title-generation';
import { providers } from '@type/providers';

describe('Title Generation', () => {
  describe('with Anthropic provider', () => {
    it('should generate title from Claude 2 response', async () => {
      const mockResponse = { content: 'Generated Title' };
      // Test implementation
    });

    it('should generate title from Claude 3 response', async () => {
      const mockResponse = {
        content: [{ type: 'text', text: 'Generated Title' }]
      };
      // Test implementation
    });

    it('should handle failed title generation gracefully', async () => {
      // Test error cases
    });
  });
});