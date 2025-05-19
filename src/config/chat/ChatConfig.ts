import { ProviderKey } from '@type/chat';
import { ModelConfig } from '@type/provider';

/**
 * Default provider to use when none is specified
 */
export const DEFAULT_PROVIDER: ProviderKey = 'anthropic';

/**
 * Default model configuration
 * This provides sensible defaults for model parameters
 */
export const DEFAULT_MODEL_CONFIG: Readonly<ModelConfig> = Object.freeze({
  model: 'claude-3-7-sonnet',
  temperature: 0.7,
  max_tokens: 4000,
  top_p: 1,
  presence_penalty: 0,
  frequency_penalty: 0,
  enableThinking: true,
  thinkingConfig: {
    budget_tokens: 1000
  }
});

/**
 * Default system message to use when none is specified
 * This sets the initial context for the AI assistant
 */
export const DEFAULT_SYSTEM_MESSAGE = `Be my helpful and honest advisor.`;

/**
 * Default chat configuration
 * This provides sensible defaults for chat settings
 */
export const DEFAULT_CHAT_CONFIG = Object.freeze({
  provider: DEFAULT_PROVIDER,
  modelConfig: DEFAULT_MODEL_CONFIG,
  systemPrompt: DEFAULT_SYSTEM_MESSAGE,
  temperature: DEFAULT_MODEL_CONFIG.temperature,
  maxTokens: DEFAULT_MODEL_CONFIG.max_tokens
});

/**
 * Chat configuration type
 */
export interface ChatConfigType {
  provider: ProviderKey;
  modelConfig: ModelConfig;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
}