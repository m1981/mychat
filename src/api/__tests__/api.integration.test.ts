import { describe, it, expect } from 'vitest';
import { providers } from '@type/providers';
import { MessageInterface, Role } from '@type/chat';
import { RequestConfig } from '@type/provider';

describe('Provider Request Formatting', () => {
  const testMessages: MessageInterface[] = [
    { role: 'user' as Role, content: 'test message' }
  ];

  describe('OpenAI Provider', () => {
    it('should format request without thinking capabilities', () => {
      const config: RequestConfig = {
        model: 'gpt-4o',
        max_tokens: 4096,
        temperature: 0.7,
        presence_penalty: 0,
        top_p: 1,
        frequency_penalty: 0,
        stream: true,
        enableThinking: true, // This should be ignored for OpenAI
        thinkingConfig: {
          budget_tokens: 16000
        }
      };

      const formattedRequest = providers.openai.formatRequest(testMessages, config);

      // Only check for the absence of thinking properties
      expect(formattedRequest).toHaveProperty('messages');
      expect(formattedRequest).toHaveProperty('model');
      expect(formattedRequest).toHaveProperty('temperature');
      expect(formattedRequest).toHaveProperty('stream');
      expect(formattedRequest).toHaveProperty('max_tokens');

      // Verify thinking-related properties are not present
      expect(formattedRequest).not.toHaveProperty('thinking');
      expect(formattedRequest).not.toHaveProperty('thinking_enabled');
      expect(formattedRequest).not.toHaveProperty('thinking_budget');
    });
  });

  describe('Anthropic Provider', () => {
    it('should format request with thinking capabilities when enabled', () => {
      const config: RequestConfig  = {
        model: 'claude-3-7-sonnet-20250219',
        max_tokens: 20000,
        temperature: 0.7,
        presence_penalty: 0,
        top_p: 1,
        frequency_penalty: 0,
        stream: true,
        enableThinking: true,
        thinkingConfig: {
          budget_tokens: 16000
        }
      };

      const formattedRequest = providers.anthropic.formatRequest(testMessages, config);

      expect(formattedRequest).toEqual({
        messages: testMessages.map(m => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content,
        })),
        model: 'claude-3-7-sonnet-20250219',
        max_tokens: 20000,
        temperature: 0.7,
        stream: true,
        thinking: {
          type: 'enabled',
          budget_tokens: 16000
        }
      });

      // Verify thinking-related properties are present and correct
      expect(formattedRequest.thinking).toBeDefined();
      expect(formattedRequest.thinking.type).toBe('enabled');
      expect(formattedRequest.thinking.budget_tokens).toBe(16000);
    });
  });
});