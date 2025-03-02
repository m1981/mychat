import { describe, it, expect } from 'vitest';
import { providers } from '@type/providers';
import { MessageInterface, Role } from '@type/chat';
import { RequestConfig } from '@type/provider';

describe('Provider Request Formatting', () => {
  const testMessages: MessageInterface[] = [
    { role: 'user' as Role, content: 'hello' }
  ];

  describe('Anthropic Provider', () => {
    it('should format basic request with correct structure', () => {
      const config: RequestConfig = {
        model: 'claude-3-7-sonnet-20250219',
        max_tokens: 4096,
        temperature: 0,
        presence_penalty: 0,
        top_p: 1,
        frequency_penalty: 0,
        stream: true,
        enableThinking: false,
        thinkingConfig: {
          budget_tokens: 1000
        }
      };

      const formattedRequest = providers.anthropic.formatRequest(testMessages, config);

      // Test top-level structure
      expect(Object.keys(formattedRequest)).toHaveLength(2);
      expect(formattedRequest).toHaveProperty('messages');
      expect(formattedRequest).toHaveProperty('config');

      // Test messages structure
      expect(formattedRequest.messages).toEqual([
        {
          role: 'user',
          content: 'hello'
        }
      ]);

      // Test config structure
      expect(formattedRequest.config).toEqual({
        model: 'claude-3-7-sonnet-20250219',
        max_tokens: 4096,
        temperature: 0,
        presence_penalty: 0,
        top_p: 1,
        frequency_penalty: 0,
        stream: true,
        thinking: undefined
      });

      // Ensure messages are not duplicated in config
      expect(formattedRequest.config).not.toHaveProperty('messages');
    });

    it('should format request with thinking enabled correctly', () => {
      const config: RequestConfig = {
        model: 'claude-3-7-sonnet-20250219',
        max_tokens: 4096,
        temperature: 0,
        presence_penalty: 0,
        top_p: 1,
        frequency_penalty: 0,
        stream: true,
        enableThinking: true,
        thinkingConfig: {
          budget_tokens: 1000
        }
      };

      const formattedRequest = providers.anthropic.formatRequest(testMessages, config);

      // Test top-level structure
      expect(Object.keys(formattedRequest)).toHaveLength(2);
      expect(formattedRequest).toHaveProperty('messages');
      expect(formattedRequest).toHaveProperty('config');

      // Test messages structure
      expect(formattedRequest.messages).toEqual([
        {
          role: 'user',
          content: 'hello'
        }
      ]);

      // Test config structure with thinking enabled
      expect(formattedRequest.config).toEqual({
        model: 'claude-3-7-sonnet-20250219',
        max_tokens: 4096,
        temperature: 0,
        presence_penalty: 0,
        top_p: 1,
        frequency_penalty: 0,
        stream: true,
        thinking: {
          type: 'enabled',
          budget_tokens: 3276 // 0.8 * 4096
        }
      });

      // Ensure messages are not duplicated in config
      expect(formattedRequest.config).not.toHaveProperty('messages');
    });

    it('should handle assistant messages correctly', () => {
      const messagesWithAssistant: MessageInterface[] = [
        { role: 'user' as Role, content: 'hello' },
        { role: 'assistant' as Role, content: 'hi there' }
      ];

      const config: RequestConfig = {
        model: 'claude-3-7-sonnet-20250219',
        max_tokens: 4096,
        temperature: 0,
        presence_penalty: 0,
        top_p: 1,
        frequency_penalty: 0,
        stream: true,
        enableThinking: false,
        thinkingConfig: {
          budget_tokens: 1000
        }
      };

      const formattedRequest = providers.anthropic.formatRequest(messagesWithAssistant, config);

      expect(formattedRequest.messages).toEqual([
        { role: 'user', content: 'hello' },
        { role: 'assistant', content: 'hi there' }
      ]);
    });
  });
});