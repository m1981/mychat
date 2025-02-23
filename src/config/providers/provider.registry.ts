// src/config/providers/provider.registry.ts
import { ProviderKey } from '@type/chat';
import { ProviderConfig, ProviderModel } from './provider.config';

const PROVIDER_CONFIGS: Record<ProviderKey, ProviderConfig> = {
  anthropic: {
    id: 'anthropic',
    name: 'Anthropic',
    defaultModel: 'claude-3-opus-latest',
    endpoints: ['api/anthropic'],
    models: [
      {
        id: 'claude-3-opus-latest',
        name: 'Claude 3 Opus',
        maxTokens: 16384,
        cost: { price: 0.015, unit: 1000 }
      },
      {
        id: 'claude-3-sonnet-latest',
        name: 'Claude 3 Sonnet',
        maxTokens: 16384,
        cost: { price: 0.008, unit: 1000 }
      }
    ]
  },
  openai: {
    id: 'openai',
    name: 'OpenAI',
    defaultModel: 'gpt-4',
    endpoints: ['api/openai'],
    models: [
      {
        id: 'gpt-4',
        name: 'GPT-4',
        maxTokens: 8192,
        cost: { price: 0.03, unit: 1000 }
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
