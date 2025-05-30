import { DEFAULT_PROVIDER } from '../constants';
import { ChatConfig, ModelConfig } from '../types';
import { ProviderRegistry } from '../registry';

// Import from centralized constants
export const DEFAULT_MODEL_CONFIG: ModelConfig = {
  model: ProviderRegistry.getDefaultModelForProvider(DEFAULT_PROVIDER),
  temperature: 0.7,
  top_p: 1,
  presence_penalty: 0,
  frequency_penalty: 0,
  max_tokens: 4096,
  enableThinking: false,
  thinkingConfig: { budget_tokens: 0 }
};

export const DEFAULT_CHAT_CONFIG: ChatConfig = {
  provider: DEFAULT_PROVIDER,
  modelConfig: DEFAULT_MODEL_CONFIG,
};