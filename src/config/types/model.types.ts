import { ProviderKey } from './provider.types';

export interface ModelCapabilities {
  modelId: string;
  provider: ProviderKey;
  maxResponseTokens: number;
  defaultResponseTokens: number;
  supportsThinking?: boolean;
  defaultThinkingBudget?: number;
}

export interface ModelConfig {
  model: string;
  max_tokens: number;
  temperature: number;
  presence_penalty: number;
  top_p: number;
  frequency_penalty: number;
  enableThinking: boolean;
  thinkingConfig: {
    budget_tokens: number;
  };
}