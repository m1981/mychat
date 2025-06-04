// provider.config.ts - Contains only configuration data
import { ProviderKey } from '@type/chat';

export interface ProviderModel {
  id: string;
  name: string;
  maxCompletionTokens: number;
  cost: {
    input: { price: number, unit: number };
    output: { price: number, unit: number };
  };
}

export interface ProviderConfig {
  id: ProviderKey;
  name: string;
  defaultModel: string;
  endpoints: string[];
  models: ProviderModel[];
}

// Configuration data only - no dependencies on implementations
export const PROVIDER_CONFIGS: Record<ProviderKey, ProviderConfig> = {
  anthropic: {
    id: 'anthropic',
    name: 'Anthropic',
    defaultModel: 'claude-3-7-sonnet-20250219',
    // Always use the secure proxy endpoint
    endpoints: ['/api/chat/anthropic'],
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
    // Always use the secure proxy endpoint
    endpoints: ['/api/chat/openai'],
    models: [
      {
        id: 'gpt-4o',
        name: 'GPT-4o',
        maxCompletionTokens: 16384,
        cost: {
          input: { price: 0.0025, unit: 1000 },
          output: { price: 0.01, unit: 1000 }
        }
      },
      // Other models...
    ]
  }
};