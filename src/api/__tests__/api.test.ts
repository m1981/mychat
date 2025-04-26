import { describe, it, expect, vi } from 'vitest';
import { getChatCompletionStream, getChatCompletion } from '../api';
import { MessageInterface, ModelConfig } from '@type/chat';
import { TitleGenerator } from '@hooks/useSubmit';

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
      config: {
        model: 'gpt-4o',
        max_tokens: 4096,
        temperature: 0.7,
        top_p: 1,
        stream: false
      },
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

  it('should format request correctly for Anthropic provider', async () => {
    global.fetch = vi.fn().mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ content: 'Test response' })
      })
    );

    await getChatCompletion(
      'anthropic',
      baseMessages,
      baseConfig,
      'test-anthropic-key',
      { 'Custom-Header': 'test' }
    );

    const expectedBody = JSON.stringify({
      messages: baseMessages,
      config: {
        model: 'gpt-4o',
        max_tokens: 4096,
        temperature: 0.7,
        top_p: 1,
        stream: false
      },
      apiKey: 'test-anthropic-key'
    });

    expect(fetch).toHaveBeenCalledWith(
      '/api/chat/anthropic',
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

  it('should handle error responses', async () => {
    global.fetch = vi.fn().mockImplementationOnce(() =>
      Promise.resolve({
        ok: false,
        text: () => Promise.resolve('API Error')
      })
    );

    await expect(
      getChatCompletion('openai', baseMessages, baseConfig, 'test-key')
    ).rejects.toThrow('API Error');
  });
});

describe('TitleGenerator', () => {
  const baseConfig: ModelConfig = {
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

  it('should handle string response', async () => {
    const stringResponse = async (messages: MessageInterface[], config: ModelConfig) => "  Test Title  ";
    const generator = new TitleGenerator(stringResponse, 'en', baseConfig);
    const title = await generator.generateChatTitle('Hello', 'Hi there');
    expect(title).toBe('Test Title');
  });

  it('should handle object response', async () => {
    const objectResponse = async (messages: MessageInterface[], config: ModelConfig) => ({ content: "  Test Title  " });
    const generator = new TitleGenerator(objectResponse, 'en', baseConfig);
    const title = await generator.generateChatTitle('Hello', 'Hi there');
    expect(title).toBe('Test Title');
  });

  it('should handle quoted response', async () => {
    const quotedResponse = async (messages: MessageInterface[], config: ModelConfig) => '"Test Title"';
    const generator = new TitleGenerator(quotedResponse, 'en', baseConfig);
    const title = await generator.generateChatTitle('Hello', 'Hi there');
    expect(title).toBe('Test Title');
  });

  it('should handle error cases', async () => {
    const invalidResponse = async (messages: MessageInterface[], config: ModelConfig) => ({} as any);
    const generator = new TitleGenerator(invalidResponse, 'en', baseConfig);
    
    await expect(
      generator.generateChatTitle('Hello', 'Hi there')
    ).rejects.toThrow('Invalid response format from title generation');
  });

  it('should handle Anthropic response format', async () => {
    const anthropicResponse = async () => ({
      message: {
        content: '  "Test Title"  '
      }
    });

    const generator = new TitleGenerator(anthropicResponse, 'en', baseConfig);
    const title = await generator.generateChatTitle('Hello', 'Hi there');
    expect(title).toBe('Test Title');
  });

  it('should handle direct content response', async () => {
    const contentResponse = async () => ({
      content: '  Test Title  '
    });

    const generator = new TitleGenerator(contentResponse, 'en', baseConfig);
    const title = await generator.generateChatTitle('Hello', 'Hi there');
    expect(title).toBe('Test Title');
  });

  it('should log and throw on invalid response', async () => {
    const consoleSpy = vi.spyOn(console, 'error');
    // Cast the invalid response to any to bypass TypeScript checks
    // since we're intentionally testing invalid input
    const invalidResponse = async () => ({ unexpected: 'format' }) as any;

    const generator = new TitleGenerator(invalidResponse, 'en', baseConfig);

    await expect(
      generator.generateChatTitle('Hello', 'Hi there')
    ).rejects.toThrow('Invalid response format from title generation');

    expect(consoleSpy).toHaveBeenCalled();
  });
});