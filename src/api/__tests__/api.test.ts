import { describe, it, expect, vi, Mock } from 'vitest';
import { getChatCompletionStream, getChatCompletion } from '../api';
import { MessageInterface, ModelConfig } from '@type/chat';
import { TitleGenerator } from '@hooks/useSubmit';
import { AIProvider } from '@type/provider';

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
  const mockProvider: AIProvider = {
    id: 'test-provider',
    name: 'Test Provider',
    endpoints: ['/test'],
    models: ['gpt-4', 'claude-3'], // Add the models we're testing with
    parseResponse: vi.fn(),
    parseStreamingResponse: vi.fn(),
    formatRequest: vi.fn(),
    parseTitleResponse: vi.fn().mockReturnValue('Test Title'),
  };

  const baseConfig: ModelConfig = {
    model: 'gpt-4', // Use a model that exists in mockProvider.models
    max_tokens: 1000,
    temperature: 0.7,
    top_p: 1,
    presence_penalty: 0,
    frequency_penalty: 0,
    enableThinking: false,
    thinkingConfig: {
      budget_tokens: 1000
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle direct content response', async () => {
    const mockGenerateTitleFn = vi.fn().mockResolvedValue('Test Title Response');
    (mockProvider.parseResponse as Mock).mockReturnValue('Test Title');

    const titleGenerator = new TitleGenerator(
      mockGenerateTitleFn,
      mockProvider,
      'en',
      baseConfig // Use the baseConfig with valid model
    );

    const result = await titleGenerator.generateChatTitle(
      'Hello',
      'Hi there'
    );

    expect(result).toBe('Test Title');
    expect(mockGenerateTitleFn).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          role: 'user',
          content: expect.stringContaining('Hello')
        })
      ]),
      baseConfig
    );
  });

  it('should handle Anthropic response format', async () => {
    const anthropicConfig = {
      ...baseConfig,
      model: 'claude-3' // Use a model that exists in mockProvider.models
    };

    const mockGenerateTitleFn = vi.fn().mockResolvedValue({ content: 'Anthropic Title' });
    (mockProvider.parseResponse as Mock).mockReturnValue('Anthropic Title');

    const titleGenerator = new TitleGenerator(
      mockGenerateTitleFn,
      mockProvider,
      'en',
      anthropicConfig
    );

    const result = await titleGenerator.generateChatTitle(
      'Hello',
      'Hi there'
    );

    expect(result).toBe('Test Title');
  });
});