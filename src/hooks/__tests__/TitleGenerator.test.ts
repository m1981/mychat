import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TitleGenerator } from '../useSubmit';
import { ModelConfig } from '@type/chat';

describe('TitleGenerator', () => {
  let mockConfig: ModelConfig;

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

    // Clear all mocks before each test
    vi.clearAllMocks();
  });

  it('should handle array response with TextResponse format', async () => {
    const mockGenerateTitle = vi.fn().mockResolvedValue([
      {
        type: 'text',
        text: 'Zoloft: SSRI Medication for Depression'
      }
    ]);

    const titleGenerator = new TitleGenerator(
      mockGenerateTitle,
      'en',
      mockConfig
    );

    const userMessage = 'What is Zoloft?';
    const assistantMessage = 'Zoloft is an SSRI antidepressant medication used to treat depression and anxiety disorders.';

    const result = await titleGenerator.generateChatTitle(
      userMessage,
      assistantMessage
    );

    expect(result).toBe('Zoloft: SSRI Medication for Depression');
    expect(mockGenerateTitle).toHaveBeenCalledWith(
      [
        {
          role: 'user',
          content: expect.stringContaining(userMessage)
        }
      ],
      mockConfig
    );
  });

  it('should handle quoted text in array response', async () => {
    const mockGenerateTitle = vi.fn().mockResolvedValue([
      {
        type: 'text',
        text: '"Understanding Zoloft Treatment"'
      }
    ]);

    const titleGenerator = new TitleGenerator(
      mockGenerateTitle,
      'en',
      mockConfig
    );

    const result = await titleGenerator.generateChatTitle(
      'What is Zoloft?',
      'Zoloft is an SSRI antidepressant medication.'
    );

    expect(result).toBe('Understanding Zoloft Treatment');
  });

  it('should throw error for invalid array response format', async () => {
    const mockGenerateTitle = vi.fn().mockResolvedValue([
      {
        invalidFormat: true,
        content: 'Invalid Response'
      }
    ]);

    const titleGenerator = new TitleGenerator(
      mockGenerateTitle,
      'en',
      mockConfig
    );

    await expect(async () => {
      await titleGenerator.generateChatTitle(
        'What is Zoloft?',
        'Zoloft is an SSRI antidepressant medication.'
      );
    }).rejects.toThrow('Invalid response format from title generation');
  });

  it('should handle empty array response', async () => {
    const mockGenerateTitle = vi.fn().mockResolvedValue([]);

    const titleGenerator = new TitleGenerator(
      mockGenerateTitle,
      'en',
      mockConfig
    );

    await expect(async () => {
      await titleGenerator.generateChatTitle(
        'What is Zoloft?',
        'Zoloft is an SSRI antidepressant medication.'
      );
    }).rejects.toThrow('Invalid response format from title generation');
  });

  it('should throw error for invalid model configuration', () => {
    const mockGenerateTitle = vi.fn();
    // Create a partial config without type assertion
    const invalidConfig: Partial<ModelConfig> = {
      ...mockConfig,
      model: undefined as unknown as string // explicitly cast to match the type
    };

    expect(() => {
      new TitleGenerator(
        mockGenerateTitle,
        'en',
        // Now cast the partial config
        invalidConfig as unknown as ModelConfig
      );
    }).toThrow('Invalid model configuration');
  });

  it('should handle error during title generation', async () => {
    const mockError = new Error('API Error');
    const mockGenerateTitle = vi.fn().mockRejectedValue(mockError);

    const titleGenerator = new TitleGenerator(
      mockGenerateTitle,
      'en',
      mockConfig
    );

    await expect(async () => {
      await titleGenerator.generateChatTitle(
        'What is Zoloft?',
        'Zoloft is an SSRI antidepressant medication.'
      );
    }).rejects.toThrow(mockError);
  });

  // Test console error logging
  it('should log error when title generation fails', async () => {
    const consoleSpy = vi.spyOn(console, 'error');
    const mockError = new Error('API Error');
    const mockGenerateTitle = vi.fn().mockRejectedValue(mockError);

    const titleGenerator = new TitleGenerator(
      mockGenerateTitle,
      'en',
      mockConfig
    );

    try {
      await titleGenerator.generateChatTitle(
        'What is Zoloft?',
        'Zoloft is an SSRI antidepressant medication.'
      );
    } catch (error) {
      // Expected to throw
    }

    expect(consoleSpy).toHaveBeenCalledWith('Title generation error:', mockError);
    consoleSpy.mockRestore();
  });
});