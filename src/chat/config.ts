import { DEFAULT_PROVIDER } from '../config/constants';
import { ModelConfig } from '../types/chat';
import { ProviderKey } from '../types/provider';

// Remove direct imports of registries to break circular dependencies
export const DEFAULT_MODEL_CONFIG: ModelConfig = {
  model: 'claude-3-7-sonnet-20250219',
  temperature: 0.7,
  top_p: 1,
  presence_penalty: 0,
  frequency_penalty: 0,
  max_tokens: 4096,
  enableThinking: false,
  thinkingConfig: { budget_tokens: 0 }
};

export interface ChatConfig {
  provider: ProviderKey;
  modelConfig: ModelConfig;
}

export const DEFAULT_CHAT_CONFIG: ChatConfig = {
  provider: DEFAULT_PROVIDER,
  modelConfig: DEFAULT_MODEL_CONFIG,
};