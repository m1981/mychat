// provider.registry.ts - Registry that works with configurations only
import { ProviderKey } from '@type/chat';
import { ProviderCapabilities, ProviderConfig, PROVIDER_CONFIGS } from './provider.config';
import { getProviderImplementation } from '@type/providers';
import { AIProviderInterface } from '@type/provider';

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

  static getProviderCapabilities(provider: ProviderKey): ProviderCapabilities {
    const providerConfig = this.getProvider(provider);
    return providerConfig.capabilities;
  }

  static getProviderImplementation(key: ProviderKey): AIProviderInterface {
    return getProviderImplementation(key);
  }
}