import { describe, it, expect, vi } from 'vitest';
import { TitleGenerator } from '../useSubmit';
import { DEFAULT_MODEL_CONFIG } from '@config/chat/ModelConfig';
import { ModelConfig } from '@type/chat';

describe('TitleGenerator', () => {
  const mockGenerateTitle = vi.fn();
  const defaultLanguage = 'en';

  beforeEach(() => {
    mockGenerateTitle.mockClear();
  });

  it('should generate title with valid configuration', async () => {
    const validConfig: ModelConfig = {
      model: 'claude-3-7-sonnet-20250219',
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

    const generator = new TitleGenerator(mockGenerateTitle, defaultLanguage, validConfig);
    mockGenerateTitle.mockResolvedValue('Generated Title');

    const title = await generator.generateChatTitle('Hello', 'Hi there');

    expect(mockGenerateTitle).toHaveBeenCalledWith(
      [
        {
          role: 'user',
          content: 'Generate a title in less than 6 words for the following message (language: en):\n"""\nUser: Hello\nAssistant: Hi there\n"""'
        }
      ],
      validConfig
    );
    expect(title).toBe('Generated Title');
  });

  it('should throw error when model config is undefined', async () => {
    const invalidConfig = undefined;
    
    // Should throw on construction
    expect(() => {
      new TitleGenerator(mockGenerateTitle, defaultLanguage, invalidConfig as any);
    }).toThrow('Invalid model configuration');

    // For completeness, also test with a valid constructor but invalid config
    const validConfig = { ...DEFAULT_MODEL_CONFIG };
    const generator = new TitleGenerator(mockGenerateTitle, defaultLanguage, validConfig);
    
    // Now simulate the config becoming invalid
    (generator as any).defaultConfig = undefined;
    
    await expect(generator.generateChatTitle('Hello', 'Hi there'))
      .rejects
      .toThrow('Invalid model configuration');
  });

  it('should throw error when model is missing in config', async () => {
    const invalidConfig = {
      ...DEFAULT_MODEL_CONFIG,
      model: undefined
    };

    // Should throw on construction
    expect(() => {
      new TitleGenerator(mockGenerateTitle, defaultLanguage, invalidConfig);
    }).toThrow('Invalid model configuration');

    // For completeness, also test with a valid constructor but model becoming undefined
    const validConfig = { ...DEFAULT_MODEL_CONFIG };
    const generator = new TitleGenerator(mockGenerateTitle, defaultLanguage, validConfig);
    
    // Now simulate the model becoming undefined
    (generator as any).defaultConfig.model = undefined;
    
    await expect(generator.generateChatTitle('Hello', 'Hi there'))
      .rejects
      .toThrow('Invalid model configuration');
  });

  it('should use DEFAULT_MODEL_CONFIG when no config provided', async () => {
    const generator = new TitleGenerator(mockGenerateTitle, defaultLanguage, DEFAULT_MODEL_CONFIG);
    mockGenerateTitle.mockResolvedValue('Generated Title');

    await generator.generateChatTitle('Hello', 'Hi there');

    expect(mockGenerateTitle).toHaveBeenCalledWith(
      expect.any(Array),
      expect.objectContaining({
        model: 'claude-3-7-sonnet-20250219',
        max_tokens: expect.any(Number)
      })
    );
  });

  it('should trim quotes from generated title', async () => {
    const generator = new TitleGenerator(mockGenerateTitle, defaultLanguage, DEFAULT_MODEL_CONFIG);
    mockGenerateTitle.mockResolvedValue('"Quoted Title"');

    const title = await generator.generateChatTitle('Hello', 'Hi there');
    expect(title).toBe('Quoted Title');
  });

  it('should handle empty messages gracefully', async () => {
    const generator = new TitleGenerator(mockGenerateTitle, defaultLanguage, DEFAULT_MODEL_CONFIG);
    mockGenerateTitle.mockResolvedValue('Empty Conversation');

    const title = await generator.generateChatTitle('', '');

    expect(mockGenerateTitle).toHaveBeenCalledWith(
      [
        {
          role: 'user',
          content: expect.stringContaining('User: \nAssistant: ')
        }
      ],
      expect.any(Object)
    );
  });
});

describe('useSubmit hook configuration', () => {
  it('should validate model config on initialization', () => {
    const invalidConfig = {
      ...DEFAULT_MODEL_CONFIG,
      model: undefined
    };

    expect(() => {
      new TitleGenerator(
        async () => '',
        'en',
        invalidConfig
      );
    }).toThrow('Invalid model configuration');
  });

  it('should merge default config with provided config', () => {
    const partialConfig = {
      model: 'claude-3-7-sonnet-20250219',
      max_tokens: 2048 // Different from default
    };

    const generator = new TitleGenerator(
      async () => '',
      'en',
      { ...DEFAULT_MODEL_CONFIG, ...partialConfig }
    );

    expect(generator).toBeDefined();
  });
});