import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getChatCompletionStream } from '../api';
import { MessageInterface, ModelConfig } from '@type/chat';

describe('getChatCompletionStream', () => {
  const mockFetch = vi.fn();
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = mockFetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.clearAllMocks();
  });

  it('should format request correctly for OpenAI provider', async () => {
    const messages: MessageInterface[] = [
      { role: 'user', content: 'Hello' }
    ];

    const config: ModelConfig = {
      model: 'gpt-4o',
      max_tokens: 4096,
      temperature: 0.7,
      presence_penalty: 0,
      frequency_penalty: 0,
      top_p: 1,
      enableThinking: false,
      thinkingConfig: {
        budget_tokens: 1000
      }
    };

    const apiKey = 'test-key';

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ content: 'response' })
    });

    await getChatCompletionStream('openai', messages, config, apiKey);

    const expectedBody = {
      messages: [{ role: 'user', content: 'Hello' }],
      model: 'gpt-4o',
      max_tokens: 4096,
      temperature: 0.7,
      presence_penalty: 0,
      frequency_penalty: 0,
      top_p: 1,
      stream: true,
      apiKey: 'test-key'
    };

    expect(mockFetch).toHaveBeenCalledWith('/api/chat/openai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: expect.any(String)
    });

    // Parse the actual body and compare objects
    const actualBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(actualBody).toEqual(expectedBody);
  });

  it('should format request correctly for Anthropic provider', async () => {
    const messages: MessageInterface[] = [
      { role: 'user', content: 'Hello' }
    ];

    const config: ModelConfig = {
      model: 'claude-3-7-sonnet-20250219',
      max_tokens: 4096,
      temperature: 0,
      presence_penalty: 0,
      frequency_penalty: 0,
      top_p: 1,
      enableThinking: false,
      thinkingConfig: {
        budget_tokens: 1000
      }
    };

    const apiKey = 'test-anthropic-key';

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ content: 'response' })
    });

    await getChatCompletionStream('anthropic', messages, config, apiKey);

    const expectedBody = {
      model: 'claude-3-7-sonnet-20250219',
      max_tokens: 4096,
      temperature: 0,
      top_p: 1,
      stream: true,
      messages: [{ role: 'user', content: 'Hello' }],
      apiKey: 'test-anthropic-key'
    };

    expect(mockFetch).toHaveBeenCalledWith('/api/chat/anthropic', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: expect.any(String)
    });

    // Parse the actual body and compare objects
    const actualBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(actualBody).toEqual(expectedBody);
  });

  it('should handle API errors correctly', async () => {
    const messages: MessageInterface[] = [
      { role: 'user', content: 'Hello' }
    ];

    const config: ModelConfig = {
      model: 'gpt-4o',
      max_tokens: 4096,
      temperature: 0.7,
      presence_penalty: 0,
      frequency_penalty: 0,
      top_p: 1,
      enableThinking: false,
      thinkingConfig: {
        budget_tokens: 1000
      }
    };

    mockFetch.mockResolvedValueOnce({
      ok: false,
      text: () => Promise.resolve('API Error')
    });

    await expect(getChatCompletionStream('openai', messages, config, 'test-key'))
      .rejects
      .toThrow('API Error');
  });

  it('should handle network errors correctly', async () => {
    const messages: MessageInterface[] = [
      { role: 'user', content: 'Hello' }
    ];

    const config: ModelConfig = {
      model: 'gpt-4o',
      max_tokens: 4096,
      temperature: 0.7,
      presence_penalty: 0,
      frequency_penalty: 0,
      top_p: 1,
      enableThinking: false,
      thinkingConfig: {
        budget_tokens: 1000
      }
    };

    mockFetch.mockRejectedValueOnce(new Error('Network Error'));

    await expect(getChatCompletionStream('openai', messages, config, 'test-key'))
      .rejects
      .toThrow('Network Error');
  });
});