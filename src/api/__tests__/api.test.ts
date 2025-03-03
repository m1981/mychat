import { describe, it, expect, vi } from 'vitest';
import { getChatCompletionStream, getChatCompletion } from '../api';
import { MessageInterface, ModelConfig } from '@type/chat';

describe('getChatCompletionStream', () => {
  const baseMessages: MessageInterface[] = [
    { role: 'user', content: 'Hello' }
  ];

  const baseOpenAIConfig: ModelConfig = {
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

  const baseAnthropicConfig: ModelConfig = {
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

  it('should format request correctly for OpenAI provider', async () => {
    const result = await getChatCompletionStream(
      'openai',
      baseMessages,
      baseOpenAIConfig,
      'test-key'
    );

    // Compare URL and headers directly
    expect(result.url).toBe('/api/chat/openai');
    expect(result.options.method).toBe('POST');
    expect(result.options.headers).toEqual({
      'Content-Type': 'application/json'
    });

    // Parse and compare body as object
    const bodyObject = JSON.parse(result.options.body);
    expect(bodyObject).toEqual({
      messages: [{ role: 'user', content: 'Hello' }],
      model: 'gpt-4o',
      max_tokens: 4096,
      temperature: 0.7,
      presence_penalty: 0,
      frequency_penalty: 0,
      top_p: 1,
      stream: true,
      apiKey: 'test-key'
    });
  });

  it('should format request correctly for Anthropic provider', async () => {
    const result = await getChatCompletionStream(
      'anthropic',
      baseMessages,
      baseAnthropicConfig,
      'test-anthropic-key'
    );

    // Compare URL and headers directly
    expect(result.url).toBe('/api/chat/anthropic');
    expect(result.options.method).toBe('POST');
    expect(result.options.headers).toEqual({
      'Content-Type': 'application/json'
    });

    // Parse and compare body as object
    const bodyObject = JSON.parse(result.options.body);
    expect(bodyObject).toEqual({
      model: 'claude-3-7-sonnet-20250219',
      max_tokens: 4096,
      temperature: 0,
      top_p: 1,
      stream: true,
      messages: [{ role: 'user', content: 'Hello' }],
      apiKey: 'test-anthropic-key'
    });
  });

  it('should throw error for invalid provider', async () => {
    await expect(
      getChatCompletionStream(
        'invalid-provider' as any,
        baseMessages,
        baseOpenAIConfig,
        'test-key'
      )
    ).rejects.toThrow("Cannot read properties of undefined (reading 'formatRequest')");
  });

  it('should handle missing API key', async () => {
    const result = await getChatCompletionStream(
      'openai',
      baseMessages,
      baseOpenAIConfig
    );

    const bodyObject = JSON.parse(result.options.body);
    expect(bodyObject).not.toHaveProperty('apiKey');
  });

  it('should always set stream to true in request', async () => {
    const configWithoutStream = { ...baseOpenAIConfig, stream: false };
    const result = await getChatCompletionStream(
      'openai',
      baseMessages,
      configWithoutStream,
      'test-key'
    );

    const bodyObject = JSON.parse(result.options.body);
    expect(bodyObject.stream).toBe(true);
  });
});

describe('getChatCompletion', () => {
  const baseMessages: MessageInterface[] = [
    { role: 'user', content: 'Hello' }
  ];

  const baseConfig: ModelConfig = {
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

  it('should format request correctly for OpenAI provider', async () => {
    global.fetch = vi.fn().mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ content: 'Test response' })
      })
    );

    await getChatCompletion(
      'openai',
      baseMessages,
      baseConfig,
      'test-key',
      { 'Custom-Header': 'test' }
    );

    const expectedBody = JSON.stringify({
      messages: baseMessages,
      model: 'gpt-4o',
      max_tokens: 4096,
      temperature: 0.7,
      presence_penalty: 0,
      top_p: 1,
      frequency_penalty: 0,
      stream: false,
      apiKey: 'test-key'
    });

    expect(fetch).toHaveBeenCalledWith(
      '/api/chat/openai',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Custom-Header': 'test'
        },
        body: expectedBody
      }
    );
  });
});