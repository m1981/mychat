/**
 * Application Constants
 * 
 * This file contains all application-wide constants.
 * Import constants from here instead of from individual files.
 */

import { PROVIDER_CAPABILITIES } from '../config/providers/defaults';
import { ProviderRegistry } from '../registry';
import { ProviderKey, ModelConfig, ChatConfig } from '../types';

// Provider constants
export const DEFAULT_PROVIDER: ProviderKey = 'anthropic';

// Chat constants
export const DEFAULT_SYSTEM_MESSAGE = 'You are a helpful assistant.';

// Get default model based on provider
export function getDefaultModel(provider: ProviderKey = DEFAULT_PROVIDER): string {
  return ProviderRegistry.getDefaultModelForProvider(provider);
}

// Model constants - derive from provider capabilities
export const DEFAULT_MODEL_CONFIG: ModelConfig = {
  model: getDefaultModel(),
  temperature: 0.7,
  top_p: 1,
  presence_penalty: 0,
  frequency_penalty: 0,
  max_tokens: PROVIDER_CAPABILITIES[DEFAULT_PROVIDER].maxCompletionTokens,
  enableThinking: PROVIDER_CAPABILITIES[DEFAULT_PROVIDER].supportsThinking,
  thinkingConfig: { 
    budget_tokens: PROVIDER_CAPABILITIES[DEFAULT_PROVIDER].defaultThinkingBudget || 0 
  }
};

export const DEFAULT_CHAT_CONFIG: ChatConfig = {
  provider: DEFAULT_PROVIDER,
  modelConfig: DEFAULT_MODEL_CONFIG,
};

// Export chat factory function
// export { generateDefaultChat } from './chat';
