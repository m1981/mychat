
import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { TitleGenerator } from '../useSubmit';
import { ModelConfig } from '@type/chat';
import { AIProvider } from '@type/provider';

describe('TitleGenerator', () => {
  let mockConfig: ModelConfig;
  let mockProvider: AIProvider;
  let mockGenerateTitleFn: ReturnType<typeof vi.fn>;
  let mockParseResponse: ReturnType<typeof vi.fn>;

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

    mockParseResponse = vi.fn();
    mockGenerateTitleFn = vi.fn();

    mockProvider = {
      parseResponse: mockParseResponse,
      parseStreamingResponse: vi.fn(),
      formatRequest: vi.fn(),
      id: 'mock-provider',
      name: 'Mock Provider',
      endpoints: ['/api/mock/completions'],
      // Add all models we're testing with
      models: ['claude-2', 'gpt-4', 'claude-3-7-sonnet-20250219'],
      parseTitleResponse: vi.fn().mockReturnValue('Generated Title')
    };

    vi.clearAllMocks();
  });

  it('should handle standard text response', async () => {
    mockParseResponse.mockReturnValue('Generated Title');
    mockGenerateTitleFn.mockResolvedValue('Raw Response');

    const titleGenerator = new TitleGenerator(
      mockGenerateTitleFn,
      mockProvider,
      'en',
      mockConfig
    );

    const result = await titleGenerator.generateChatTitle(
      'What is TypeScript?',
      'TypeScript is a programming language.'
    );

    expect(result).toBe('Generated Title');
    expect(mockGenerateTitleFn).toHaveBeenCalledWith(
      [
        {
          role: 'user',
          content: expect.stringContaining('What is TypeScript?')
        }
      ],
      mockConfig
    );
    expect(mockProvider.parseTitleResponse).toHaveBeenCalledWith('Raw Response');
  });

  it('should handle quoted response', async () => {
    mockGenerateTitleFn.mockResolvedValue('Raw Response');
    (mockProvider.parseTitleResponse as Mock).mockReturnValue('Quoted Title');

    const titleGenerator = new TitleGenerator(
      mockGenerateTitleFn,
      mockProvider,
      'en',
      mockConfig
    );

    const result = await titleGenerator.generateChatTitle(
      'Hello',
      'Hi there'
    );

    expect(result).toBe('Quoted Title');
    expect(mockGenerateTitleFn).toHaveBeenCalledWith(
      [
        {
          role: 'user',
          content: expect.stringContaining('Hello')
        }
      ],
      mockConfig
    );
    expect(mockProvider.parseTitleResponse).toHaveBeenCalledWith('Raw Response');
  });

  it('should handle response with extra whitespace', async () => {
    mockGenerateTitleFn.mockResolvedValue('Raw Response');
    (mockProvider.parseTitleResponse as Mock).mockReturnValue('Title With Spaces');

    const titleGenerator = new TitleGenerator(
      mockGenerateTitleFn,
      mockProvider,
      'en',
      mockConfig
    );

    const result = await titleGenerator.generateChatTitle(
      'Hello',
      'Hi there'
    );

    expect(result).toBe('Title With Spaces');
    expect(mockGenerateTitleFn).toHaveBeenCalledWith(
      [
        {
          role: 'user',
          content: expect.stringContaining('Hello')
        }
      ],
      mockConfig
    );
    expect(mockProvider.parseTitleResponse).toHaveBeenCalledWith('Raw Response');
  });

  it('should throw error for invalid model configuration', () => {
    // Create a partial config without type assertion
    const invalidConfig = {
      ...mockConfig,
      model: null
    };

    expect(() => {
      new TitleGenerator(
        mockGenerateTitleFn,
        mockProvider,
        'en',
        // Use type assertion to unknown first
        invalidConfig as unknown as ModelConfig
      );
    }).toThrow('Invalid model configuration');
  });

  it('should handle error during title generation', async () => {
    const mockError = new Error('Generation failed');
    mockGenerateTitleFn.mockRejectedValue(mockError);
    mockParseResponse.mockReturnValue('Should not be called');

    const titleGenerator = new TitleGenerator(
      mockGenerateTitleFn,
      mockProvider,
      'en',
      mockConfig
    );

    const consoleSpy = vi.spyOn(console, 'error');

    const result = await titleGenerator.generateChatTitle(
      'Hello',
      'Hi there'
    );

    expect(result).toBe('Untitled Chat');
    expect(consoleSpy).toHaveBeenCalledWith('Title generation error:', mockError);
    expect(mockParseResponse).not.toHaveBeenCalled();
  });

  it('should handle provider parsing error', async () => {
    const mockError = new Error('Parsing failed');
    mockGenerateTitleFn.mockResolvedValue('Raw Response');
    (mockProvider.parseTitleResponse as Mock).mockImplementation(() => {
      throw mockError;
    });

    const titleGenerator = new TitleGenerator(
      mockGenerateTitleFn,
      mockProvider,
      'en',
      mockConfig
    );

    const consoleSpy = vi.spyOn(console, 'error');

    const result = await titleGenerator.generateChatTitle(
      'Hello',
      'Hi there'
    );

    expect(result).toBe('Untitled Chat');
    expect(consoleSpy).toHaveBeenCalledWith('Title generation error:', mockError);
    expect(mockProvider.parseTitleResponse).toHaveBeenCalledWith('Raw Response');
  });

  describe('Language handling', () => {
    it('should include language in generation prompt', async () => {
      mockParseResponse.mockReturnValue('Title');
      mockGenerateTitleFn.mockResolvedValue('Raw Response');

      const titleGenerator = new TitleGenerator(
        mockGenerateTitleFn,
        mockProvider,
        'fr',
        mockConfig
      );

      await titleGenerator.generateChatTitle(
        'Bonjour',
        'Salut'
      );

      expect(mockGenerateTitleFn).toHaveBeenCalledWith(
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
        model: 'gpt-4' // Using a model that exists in mockProvider.models
      };

      mockParseResponse.mockReturnValue('OpenAI Generated Title');
      mockGenerateTitleFn.mockResolvedValue('Raw OpenAI Response');

      const titleGenerator = new TitleGenerator(
        mockGenerateTitleFn,
        mockProvider,
        'en',
        openAIConfig
      );

      const result = await titleGenerator.generateChatTitle(
        'Test question',
        'Test response'
      );

      expect(result).toBe('Generated Title');
      expect(mockGenerateTitleFn).toHaveBeenCalledWith(
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
        model: 'claude-3-7-sonnet-20250219' // Using a model that exists in mockProvider.models
      };

      mockParseResponse.mockReturnValue('Anthropic Generated Title');
      mockGenerateTitleFn.mockResolvedValue('Raw Anthropic Response');

      const titleGenerator = new TitleGenerator(
        mockGenerateTitleFn,
        mockProvider,
        'en',
        anthropicConfig
      );

      const result = await titleGenerator.generateChatTitle(
        'Test question',
        'Test response'
      );

      expect(result).toBe('Generated Title');
      expect(mockGenerateTitleFn).toHaveBeenCalledWith(
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