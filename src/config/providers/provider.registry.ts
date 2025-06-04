// provider.registry.ts - Registry that works with configurations only
import { ProviderKey } from '@type/chat';
import { ProviderConfig, PROVIDER_CONFIGS } from './provider.config';
import { getProviderImplementation } from '@type/providers';

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
        maxCompletionTokens: defaultModel.maxCompletionTokens,
        defaultModel: providerConfig.defaultModel
      };
    }
    
    if (provider === 'openai') {
      return {
        supportsThinking: false,
        maxCompletionTokens: defaultModel.maxCompletionTokens,
        defaultModel: providerConfig.defaultModel
      };
    }

    throw new Error(`Provider ${provider} not supported`);
  }

  static getProviderImplementation(key: ProviderKey): AIProviderInterface {
    return getProviderImplementation(key);
  }
}