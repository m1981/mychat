import { ProviderKey, ChatConfig } from '@type/chat';
import { ModelConfig } from '@type/provider';
import { createDefaultModelConfig } from './ModelDefaults';

/**
 * Default provider to use when none is specified
 */
export const DEFAULT_PROVIDER: ProviderKey = 'anthropic';

/**
 * Default system message to use when none is specified
 */
export const DEFAULT_SYSTEM_MESSAGE = `Be my helpful and honest advisor.`;

/**
 * Create default model configuration
 * This provides a factory function to get fresh default config
 */
export const DEFAULT_MODEL_CONFIG = createDefaultModelConfig();

/**
 * Default chat configuration
 * This provides sensible defaults for chat settings
 */
export const DEFAULT_CHAT_CONFIG: Readonly<ChatConfig> = Object.freeze({
  provider: DEFAULT_PROVIDER,
  modelConfig: DEFAULT_MODEL_CONFIG,
  systemPrompt: DEFAULT_SYSTEM_MESSAGE
});

/**
 * Create a fresh default chat configuration
 * This ensures we get a new object instance each time
 */
export function createDefaultChatConfig(): ChatConfig {
  return {
    provider: DEFAULT_PROVIDER,
    modelConfig: createDefaultModelConfig(),
    systemPrompt: DEFAULT_SYSTEM_MESSAGE
  };
}
