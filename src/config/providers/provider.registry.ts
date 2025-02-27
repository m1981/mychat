// src/config/providers/provider.registry.ts
import { ProviderKey } from '@type/chat';
import { ProviderConfig } from './provider.config';

const PROVIDER_CONFIGS: Record<ProviderKey, ProviderConfig> = {
  anthropic: {
    id: 'anthropic',
    name: 'Anthropic',
    defaultModel: 'claude-3-7-sonnet-20250219',
    endpoints: ['/chat/anthropic'],
    models: [
      {
        id: 'claude-3-7-sonnet-20250219',
        name: 'Claude 3.7 Sonnet',
        contextWindow: 200000,
        maxCompletionTokens: 8192,
        cost: {
          input: { price: 0.003, unit: 1000 },
          output: { price: 0.015, unit: 1000 }
        }
      },
      {
        id: 'claude-3-5-sonnet-20241022',
        name: 'Claude 3.5 Sonnet',
        contextWindow: 200000,
        maxCompletionTokens: 8192,
        cost: {
          input: { price: 0.003, unit: 1000 },
          output: { price: 0.015, unit: 1000 }
        }
      },
      {
        id: 'claude-3-haiku-20240307',
        name: 'Claude 3 Haiku',
        contextWindow: 200000,
        maxCompletionTokens: 4096,
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
        contextWindow: 127000,
        maxCompletionTokens: 16384,
        cost: {
          input: { price: 0.0025, unit: 1000 },
          output: { price: 0.01, unit: 1000 }
        }
      },
      {
        id: 'gpt-4o-mini',
        name: 'GPT-4o mini',
        contextWindow: 127000,
        maxCompletionTokens: 16384,
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

  static getProviderCapabilities(provider: ProviderKey) {
    const providerConfig = this.getProvider(provider);
    const defaultModel = providerConfig.models.find(m => m.id === providerConfig.defaultModel);
    
    if (!defaultModel) {
      throw new Error(`Default model not found for provider ${provider}`);
    }

    if (provider === 'anthropic') {
      return {
        supportsThinking: true,
        defaultThinkingModel: providerConfig.defaultModel,
        contextWindow: defaultModel.contextWindow,
        maxCompletionTokens: defaultModel.maxCompletionTokens,
        defaultModel: providerConfig.defaultModel
      };
    }
    
    if (provider === 'openai') {
      return {
        supportsThinking: false,
        contextWindow: defaultModel.contextWindow,
        maxCompletionTokens: defaultModel.maxCompletionTokens,
        defaultModel: providerConfig.defaultModel
      };
    }

    throw new Error(`Provider ${provider} not supported`);
  }
}
