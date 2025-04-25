
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TitleGenerator } from '../useSubmit';
import { ModelConfig } from '@type/chat';
import { AIProvider } from '@type/provider';

describe('TitleGenerator', () => {
  let mockConfig: ModelConfig;
  let mockProvider: AIProvider;

  beforeEach(() => {
    mockConfig = {
      model: 'claude-2',
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

    mockProvider = {
      parseResponse: vi.fn(),
      parseStreamingResponse: vi.fn(),
      formatRequest: vi.fn(),
      generateTitle: vi.fn(),
      id: 'mock-provider'
    };

    vi.clearAllMocks();
  });

  it('should handle standard text response', async () => {
    mockProvider.parseResponse.mockReturnValue('Generated Title');
    mockProvider.generateTitle.mockResolvedValue('Raw Response');

    const titleGenerator = new TitleGenerator(
      mockProvider,
      'en',
      mockConfig
    );

    const result = await titleGenerator.generateChatTitle(
      'What is TypeScript?',
      'TypeScript is a programming language.'
    );

    expect(result).toBe('Generated Title');
    expect(mockProvider.generateTitle).toHaveBeenCalledWith(
      [
        {
          role: 'user',
          content: expect.stringContaining('What is TypeScript?')
        }
      ],
      mockConfig
    );
    expect(mockProvider.parseResponse).toHaveBeenCalledWith('Raw Response');
  });

  it('should handle quoted response', async () => {
    mockProvider.parseResponse.mockReturnValue('"Quoted Title"');
    mockProvider.generateTitle.mockResolvedValue('Raw Response');

    const titleGenerator = new TitleGenerator(
      mockProvider,
      'en',
      mockConfig
    );

    const result = await titleGenerator.generateChatTitle(
      'Hello',
      'Hi there'
    );

    expect(result).toBe('Quoted Title');
    expect(mockProvider.parseResponse).toHaveBeenCalledWith('Raw Response');
  });

  it('should handle response with extra whitespace', async () => {
    mockProvider.parseResponse.mockReturnValue('  Title With Spaces  ');
    mockProvider.generateTitle.mockResolvedValue('Raw Response');

    const titleGenerator = new TitleGenerator(
      mockProvider,
      'en',
      mockConfig
    );

    const result = await titleGenerator.generateChatTitle(
      'Hello',
      'Hi there'
    );

    expect(result).toBe('Title With Spaces');
    expect(mockProvider.parseResponse).toHaveBeenCalledWith('Raw Response');
  });

  it('should throw error for invalid model configuration', () => {
    const invalidConfig = { ...mockConfig, model: undefined };

    expect(() => {
      new TitleGenerator(
        mockProvider,
        'en',
        invalidConfig as ModelConfig
      );
    }).toThrow('Invalid model configuration');
  });

  it('should handle error during title generation', async () => {
    const mockError = new Error('Generation failed');
    mockProvider.generateTitle.mockRejectedValue(mockError);
    mockProvider.parseResponse.mockReturnValue('Should not be called');

    const titleGenerator = new TitleGenerator(
      mockProvider,
      'en',
      mockConfig
    );

    const consoleSpy = vi.spyOn(console, 'error');

    await expect(async () => {
      await titleGenerator.generateChatTitle(
        'Hello',
        'Hi there'
      );
    }).rejects.toThrow(mockError);

    expect(consoleSpy).toHaveBeenCalledWith('Title generation error:', mockError);
    expect(mockProvider.parseResponse).not.toHaveBeenCalled();
  });

  it('should handle provider parsing error', async () => {
    const mockError = new Error('Parsing failed');
    mockProvider.parseResponse.mockImplementation(() => {
      throw mockError;
    });
    mockProvider.generateTitle.mockResolvedValue('Raw Response');

    const titleGenerator = new TitleGenerator(
      mockProvider,
      'en',
      mockConfig
    );

    const consoleSpy = vi.spyOn(console, 'error');

    await expect(async () => {
      await titleGenerator.generateChatTitle(
        'Hello',
        'Hi there'
      );
    }).rejects.toThrow(mockError);

    expect(consoleSpy).toHaveBeenCalledWith('Title generation error:', mockError);
    expect(mockProvider.parseResponse).toHaveBeenCalledWith('Raw Response');
  });

  describe('Language handling', () => {
    it('should include language in generation prompt', async () => {
      mockProvider.parseResponse.mockReturnValue('Title');
      mockProvider.generateTitle.mockResolvedValue('Raw Response');

      const titleGenerator = new TitleGenerator(
        mockProvider,
        'fr',
        mockConfig
      );

      await titleGenerator.generateChatTitle(
        'Bonjour',
        'Salut'
      );

      expect(mockProvider.generateTitle).toHaveBeenCalledWith(
        [
          {
            role: 'user',
            content: expect.stringContaining('language: fr')
          }
        ],
        mockConfig
      );
    });
  });

  describe('Provider-specific title generation', () => {
    it('should handle OpenAI title generation', async () => {
      const openAIConfig = {
        ...mockConfig,
        model: 'gpt-4'
      };

      mockProvider.parseResponse.mockReturnValue('OpenAI Generated Title');
      mockProvider.generateTitle.mockResolvedValue('Raw OpenAI Response');

      const titleGenerator = new TitleGenerator(
        mockProvider,
        'en',
        openAIConfig
      );

      const result = await titleGenerator.generateChatTitle(
        'Test question',
        'Test response'
      );

      expect(result).toBe('OpenAI Generated Title');
      expect(mockProvider.generateTitle).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            role: 'user',
            content: expect.stringContaining('Test question')
          })
        ]),
        openAIConfig
      );
    });

    it('should handle Anthropic title generation', async () => {
      const anthropicConfig = {
        ...mockConfig,
        model: 'claude-3-7-sonnet-20250219'
      };

      mockProvider.parseResponse.mockReturnValue('Anthropic Generated Title');
      mockProvider.generateTitle.mockResolvedValue('Raw Anthropic Response');

      const titleGenerator = new TitleGenerator(
        mockProvider,
        'en',
        anthropicConfig
      );

      const result = await titleGenerator.generateChatTitle(
        'Test question',
        'Test response'
      );

      expect(result).toBe('Anthropic Generated Title');
      expect(mockProvider.generateTitle).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            role: 'user',
            content: expect.stringContaining('Test question')
          })
        ]),
        anthropicConfig
      );
    });
  });
});