import { describe, it, expect } from 'vitest';
import { providers } from '@type/providers';
import { MessageInterface, Role } from '@type/chat';
import { RequestConfig } from '@type/provider';

describe('Provider Request Formatting', () => {
  describe('Anthropic Provider', () => {
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

    it('should match exact Anthropic API request format (visual inspection)', () => {
      const messages = [
        { role: 'user' as Role, content: 'Are there an infinite number of prime numbers such that n mod 4 == 3?' }
      ];

      const config: RequestConfig = {
        model: 'claude-3-7-sonnet-20250219',
        max_tokens: 20000,
        temperature: 0.7,
        presence_penalty: 0,
        frequency_penalty: 0,
        top_p: 1,
        stream: false,
        enableThinking: true,
        thinkingConfig: {
          budget_tokens: 16000
        }
      };

      const formattedRequest = providers.anthropic.formatRequest(messages, config);
      
      // Convert actual result to formatted string
      const actualFormatted = JSON.stringify(formattedRequest, null, 2);
      
      // Expected format as a string
      const expectedFormatted = JSON.stringify({
        model: "claude-3-7-sonnet-20250219",
        max_tokens: 20000,
        temperature: 0.7,
        top_p: 1,
        stream: false,
        thinking: {
          type: "enabled",
          budget_tokens: 16000
        },
        messages: [
          {
            role: "user",
            content: "Are there an infinite number of prime numbers such that n mod 4 == 3?"
          }
        ],
      }, null, 2);

      // Compare formatted strings
      expect(actualFormatted).toBe(expectedFormatted);
      
      // Log both for visual inspection during test development
      console.log('\nActual Request Format:');
      console.log(actualFormatted);
      console.log('\nExpected Request Format:');
      console.log(expectedFormatted);
    });
  });

  describe('OpenAI Provider', () => {
    it('should match exact OpenAI SDK request format', () => {
      const messages = [
        { role: 'user' as Role, content: 'Say this is a test' }
      ];

      const config: RequestConfig = {
        model: 'gpt-4o',
        max_tokens: 16384,
        temperature: 0.7,
        presence_penalty: 0,
        frequency_penalty: 0,
        top_p: 1,
        stream: true,
        enableThinking: false,
        thinkingConfig: {
          budget_tokens: 0
        }
      };

      const formattedRequest = providers.openai.formatRequest(messages, config);
      
      const expectedFormatted = JSON.stringify({
        messages: [{
          role: "user",
          content: "Say this is a test"
          }
        ],
        model: "gpt-4o",
        max_tokens: 4096,
        temperature: 0.7,
        presence_penalty: 0,
        top_p: 1,
        frequency_penalty: 0,
        stream: true
      }, null, 2);

      const actualFormatted = JSON.stringify(formattedRequest, null, 2);

      // Compare formatted strings
      expect(actualFormatted).toBe(expectedFormatted);
      
      // Log for visual inspection
      console.log('\nActual OpenAI Request Format:');
      console.log(actualFormatted);
      console.log('\nExpected OpenAI Request Format:');
      console.log(expectedFormatted);
    });
  });
});