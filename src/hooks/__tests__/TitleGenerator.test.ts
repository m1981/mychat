
import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { TitleGenerator } from '../useSubmit';
import { ModelConfig } from '@type/chat';
import { AIProvider } from '@type/provider';
import { DEFAULT_MODEL_CONFIG } from '@config/chat/ModelConfig';

describe('TitleGenerator', () => {
  let mockGenerateTitleFn: Mock;
  let mockParseResponse: Mock;
  let mockOpenAIProvider: AIProvider;
  let mockAnthropicProvider: AIProvider;
  let baseConfig: ModelConfig;

  beforeEach(() => {
    mockGenerateTitleFn = vi.fn();
    mockParseResponse = vi.fn();

    baseConfig = {
      model: 'gpt-4',
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

    // Separate provider mocks for clearer testing
    mockOpenAIProvider = {
      id: 'openai',
      name: 'OpenAI',
      endpoints: ['/api/openai/completions'],
      models: ['gpt-4', 'gpt-3.5-turbo'],
      parseResponse: mockParseResponse,
      parseStreamingResponse: vi.fn(),
      formatRequest: vi.fn(),
      parseTitleResponse: vi.fn().mockReturnValue('OpenAI Title')
    };

    mockAnthropicProvider = {
      id: 'anthropic',
      name: 'Anthropic',
      endpoints: ['/api/anthropic/completions'],
      models: ['claude-3-7-sonnet-20250219', 'claude-3-5-sonnet-20241022'],
      parseResponse: mockParseResponse,
      parseStreamingResponse: vi.fn(),
      formatRequest: vi.fn(),
      parseTitleResponse: vi.fn().mockReturnValue('Anthropic Title')
    };

    vi.clearAllMocks();
  });

  describe('Provider Configuration Validation', () => {
    it('should validate OpenAI configuration correctly', () => {
      const openAIConfig = {
        ...baseConfig,
        model: 'gpt-4'
      };

      const titleGenerator = new TitleGenerator(
        mockGenerateTitleFn,
        mockOpenAIProvider,
        'en',
        openAIConfig
      );

      expect(titleGenerator).toBeTruthy();
      expect(mockOpenAIProvider.formatRequest).not.toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ model: 'claude-3-7-sonnet-20250219' })
      );
    });

    it('should validate Anthropic configuration correctly', () => {
      const anthropicConfig = {
        ...baseConfig,
        model: 'claude-3-7-sonnet-20250219'
      };

      const titleGenerator = new TitleGenerator(
        mockGenerateTitleFn,
        mockAnthropicProvider,
        'en',
        anthropicConfig
      );

      expect(titleGenerator).toBeTruthy();
      expect(mockAnthropicProvider.formatRequest).not.toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ model: 'gpt-4' })
      );
    });

    it('should reject OpenAI provider with Anthropic model', () => {
      const invalidConfig = {
        ...baseConfig,
        model: 'claude-3-7-sonnet-20250219'
      };

      expect(() => {
        new TitleGenerator(
          mockGenerateTitleFn,
          mockOpenAIProvider,
          'en',
          invalidConfig
        );
      }).toThrow('Invalid model configuration for provider openai');
    });

    it('should reject Anthropic provider with OpenAI model', () => {
      const invalidConfig = {
        ...baseConfig,
        model: 'gpt-4'
      };

      expect(() => {
        new TitleGenerator(
          mockGenerateTitleFn,
          mockAnthropicProvider,
          'en',
          invalidConfig
        );
      }).toThrow('Invalid model configuration for provider anthropic');
    });

    it('should validate model exists in provider models list', () => {
      const invalidConfig = {
        ...baseConfig,
        model: 'nonexistent-model'
      };

      expect(() => {
        new TitleGenerator(
          mockGenerateTitleFn,
          mockOpenAIProvider,
          'en',
          invalidConfig
        );
      }).toThrow('Invalid model configuration for provider openai');
    });
  });

  describe('Configuration Inheritance and Overrides', () => {
    describe('OpenAI Configuration', () => {
      beforeEach(() => {
        // Setup mock to return a successful response
        mockGenerateTitleFn.mockResolvedValue({
          choices: [{ message: { content: 'Test Title' } }]
        });
      });

      it('should use OpenAI-specific defaults when partial config provided', async () => {
        const partialConfig: Partial<ModelConfig> = {
          model: 'gpt-4',
          temperature: 0.8
        };

        const titleGenerator = new TitleGenerator(
          mockGenerateTitleFn,
          mockOpenAIProvider,
          'en',
          { ...DEFAULT_MODEL_CONFIG, ...partialConfig }
        );

        // Trigger the request to generate a title
        await titleGenerator.generateChatTitle('Hello', 'Hi there');

        // Verify the generateTitleFn was called with correct parameters
        expect(mockGenerateTitleFn).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: expect.stringContaining('Hello')
            })
          ]),
          expect.objectContaining({
            model: 'gpt-4',
            temperature: 0.8,
            max_tokens: DEFAULT_MODEL_CONFIG.max_tokens,
            presence_penalty: DEFAULT_MODEL_CONFIG.presence_penalty,
            frequency_penalty: DEFAULT_MODEL_CONFIG.frequency_penalty,
            top_p: DEFAULT_MODEL_CONFIG.top_p
          })
        );
      });

      it('should override all default values when full config provided', async () => {
        const fullConfig: ModelConfig = {
          model: 'gpt-4',
          max_tokens: 2000,
          temperature: 0.9,
          presence_penalty: 0.5,
          frequency_penalty: 0.5,
          top_p: 0.8,
          enableThinking: true,
          thinkingConfig: {
            budget_tokens: 500
          }
        };

        const titleGenerator = new TitleGenerator(
          mockGenerateTitleFn,
          mockOpenAIProvider,
          'en',
          fullConfig
        );

        await titleGenerator.generateChatTitle('Hello', 'Hi there');

        expect(mockGenerateTitleFn).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: expect.stringContaining('Hello')
            })
          ]),
          expect.objectContaining(fullConfig)
        );
      });
    });

    describe('Anthropic Configuration', () => {
      beforeEach(() => {
        // Setup mock to return a successful response
        mockGenerateTitleFn.mockResolvedValue({
          content: 'Test Title'
        });
      });

      it('should use Anthropic-specific defaults when partial config provided', async () => {
        const partialConfig: Partial<ModelConfig> = {
          model: 'claude-3-7-sonnet-20250219',
          temperature: 0.8
        };

        const titleGenerator = new TitleGenerator(
          mockGenerateTitleFn,
          mockAnthropicProvider,
          'en',
          { ...DEFAULT_MODEL_CONFIG, ...partialConfig }
        );

        await titleGenerator.generateChatTitle('Hello', 'Hi there');

        expect(mockGenerateTitleFn).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: expect.stringContaining('Hello')
            })
          ]),
          expect.objectContaining({
            model: 'claude-3-7-sonnet-20250219',
            temperature: 0.8,
            max_tokens: DEFAULT_MODEL_CONFIG.max_tokens,
            top_p: DEFAULT_MODEL_CONFIG.top_p
          })
        );
      });

      it('should handle provider-specific parameters correctly', async () => {
        const anthropicConfig: ModelConfig = {
          model: 'claude-3-7-sonnet-20250219',
          max_tokens: 2000,
          temperature: 0.9,
          top_p: 0.8,
          presence_penalty: 0,    // Added missing required property
          frequency_penalty: 0,   // Added missing required property
          enableThinking: true,
          thinkingConfig: {
            budget_tokens: 500
          }
        };

        const titleGenerator = new TitleGenerator(
          mockGenerateTitleFn,
          mockAnthropicProvider,
          'en',
          anthropicConfig
        );

        await titleGenerator.generateChatTitle('Hello', 'Hi there');

        expect(mockGenerateTitleFn).toHaveBeenCalledWith(
          expect.any(Array),
          expect.objectContaining({
            model: 'claude-3-7-sonnet-20250219',
            temperature: 0.9,
            max_tokens: 2000,
            top_p: 0.8
          })
        );
      });
    });

    describe('Configuration Validation', () => {
      it('should throw error when required config parameters are missing', () => {
        // Create a type that allows undefined model
        type PartialConfig = Omit<ModelConfig, 'model'> & { model?: string };
        
        const invalidConfig: PartialConfig = {
          ...baseConfig,
          model: undefined
        };

        expect(() => {
          new TitleGenerator(
            mockGenerateTitleFn,
            mockOpenAIProvider,
            'en',
            invalidConfig as ModelConfig // Type assertion here is intentional for testing
          );
        }).toThrow('Invalid model configuration for provider openai');
      });

      it('should throw error when temperature is out of valid range', () => {
        const invalidConfig: ModelConfig = {
          ...baseConfig,
          temperature: 2.0
        };

        expect(() => {
          new TitleGenerator(
            mockGenerateTitleFn,
            mockOpenAIProvider,
            'en',
            invalidConfig
          );
        }).toThrow('Invalid model configuration for provider openai');
      });

      it('should throw error when top_p is out of valid range', () => {
        const invalidConfig: ModelConfig = {
          ...baseConfig,
          top_p: -0.5
        };

        expect(() => {
          new TitleGenerator(
            mockGenerateTitleFn,
            mockOpenAIProvider,
            'en',
            invalidConfig
          );
        }).toThrow('Invalid model configuration for provider openai');
      });

      it('should throw error when presence_penalty is out of valid range', () => {
        const invalidConfig: ModelConfig = {
          ...baseConfig,
          presence_penalty: 3.0
        };

        expect(() => {
          new TitleGenerator(
            mockGenerateTitleFn,
            mockOpenAIProvider,
            'en',
            invalidConfig
          );
        }).toThrow('Invalid model configuration for provider openai');
      });

      it('should throw error when frequency_penalty is out of valid range', () => {
        const invalidConfig: ModelConfig = {
          ...baseConfig,
          frequency_penalty: -3.0
        };

        expect(() => {
          new TitleGenerator(
            mockGenerateTitleFn,
            mockOpenAIProvider,
            'en',
            invalidConfig
          );
        }).toThrow('Invalid model configuration for provider openai');
      });

      it('should throw error when max_tokens is invalid', () => {
        const invalidConfig: ModelConfig = {
          ...baseConfig,
          max_tokens: 0
        };

        expect(() => {
          new TitleGenerator(
            mockGenerateTitleFn,
            mockOpenAIProvider,
            'en',
            invalidConfig
          );
        }).toThrow('Invalid model configuration for provider openai');
      });
    });
  });
});