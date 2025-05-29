import { ProviderKey, ProviderConfig } from '../types/provider.types';

export const PROVIDER_CONFIGS: Record<ProviderKey, ProviderConfig> = {
  anthropic: {
    id: 'anthropic',
    name: 'Anthropic',
    defaultModel: 'claude-3-7-sonnet-20250219',
    endpoints: ['/chat/anthropic'],
    models: [
      {
        id: 'claude-3-7-sonnet-20250219',
        name: 'Claude 3.7 Sonnet',
        maxCompletionTokens: 8192,
        cost: {
          input: { price: 0.003, unit: 1000 },
          output: { price: 0.015, unit: 1000 }
        }
      },
      // Other models...
    ]
  },
  openai: {
    id: 'openai',
    name: 'OpenAI',
    defaultModel: 'gpt-4o',
    endpoints: ['chat/openai'],
    models: [
      {
        id: 'gpt-4o',
        name: 'GPT-4o',
        maxCompletionTokens: 4096,
        cost: {
          input: { price: 0.01, unit: 1000 },
          output: { price: 0.03, unit: 1000 }
        }
      }
      // Other models...
    ]
  }
};