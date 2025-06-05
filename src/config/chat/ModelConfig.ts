import { ProviderKey } from '../types/provider';
import { DEFAULT_TOKEN_CONFIG, validateMaxTokens } from '../tokens/TokenConfig';

export interface ModelConfig {
  provider: ProviderKey;
  model: string;
  max_tokens: number; // Maximum number of tokens the model can generate in a response
  temperature: number;
  top_p: number;
  presence_penalty: number;
  frequency_penalty: number;
  enableThinking: boolean;
  thinkingConfig: {
    budget_tokens: number;
  };
}

export const DEFAULT_MODEL_CONFIG: ModelConfig = {
  provider: 'openai',
  model: 'gpt-3.5-turbo',
  max_tokens: DEFAULT_TOKEN_CONFIG.max_tokens,
  temperature: 0.7,
  top_p: 1,
  presence_penalty: 0,
  frequency_penalty: 0,
  enableThinking: false,
  thinkingConfig: {
    budget_tokens: DEFAULT_TOKEN_CONFIG.thinking.budget_tokens
  }
};