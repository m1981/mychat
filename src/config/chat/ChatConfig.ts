import { ProviderKey } from '@type/provider';
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
  // Use the full model ID including version
  model: 'claude-3-7-sonnet-20250219',
  max_tokens: 4096,
  temperature: 0.7,
  top_p: 1.0,
  presence_penalty: 0,
  frequency_penalty: 0,
  thinking_mode: {
    enabled: false,
    budget_tokens: 16000
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

