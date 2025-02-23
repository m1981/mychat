// src/config/providers/provider.registry.ts
import { ProviderKey } from '@type/chat';
import { ProviderConfig } from './provider.config';

const PROVIDER_CONFIGS: Record<ProviderKey, ProviderConfig> = {
  anthropic: {
    id: 'anthropic',
    name: 'Anthropic',
    defaultModel: 'claude-3-5-sonnet-20241022',
    endpoints: ['api/anthropic'],
    models: [
      {
        id: 'claude-3-5-sonnet-20241022',
        name: 'Claude 3.5 Sonnet',
        maxTokens: 200000,
        cost: {
          input: { price: 0.003, unit: 1000 },
          output: { price: 0.015, unit: 1000 }
        }
      },
      {
        id: 'claude-3-haiku-20240307',
        name: 'Claude 3 Haiku',
        maxTokens: 200000,
        cost: {
          input: { price: 0.00025, unit: 1000 },
          output: { price: 0.00125, unit: 1000 }
        }
      }
    ]
  },
  openai: {
    id: 'openai',
    name: 'OpenAI',
    defaultModel: 'gpt-4o',
    endpoints: ['api/openai'],
    models: [
      {
        id: 'gpt-4o',
        name: 'GPT-4o',
        maxTokens: 127000,  // Slightly reduced to provide safety margin
        cost: {
          input: { price: 0.0025, unit: 1000 },
          output: { price: 0.01, unit: 1000 }
        }
      },
      {
        id: 'gpt-4o-mini',
        name: 'GPT-4o mini',
        maxTokens: 128000,
        cost: {
          input: { price: 0.00015, unit: 1000 },
          output: { price: 0.0006, unit: 1000 }
        }
      }
    ]
  }
};

export class ProviderRegistry {
  static getProvider(key: ProviderKey): ProviderConfig {
    const provider = PROVIDER_CONFIGS[key];
    if (!provider) {
      throw new Error(`Provider ${key} not found`);
    }
    return provider;
  }

  static getDefaultModelForProvider(key: ProviderKey): string {
    return this.getProvider(key).defaultModel;
  }

  static validateModelForProvider(provider: ProviderKey, modelId: string): boolean {
    return this.getProvider(provider).models.some(model => model.id === modelId);
  }
}