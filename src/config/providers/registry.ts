import { ProviderKey, ProviderConfig, ProviderCapabilities } from '../types/provider.types';
import { PROVIDER_CONFIGS } from './defaults';

export class ProviderRegistry {
  /**
   * Get provider configuration by key
   */
  static getProvider(key: ProviderKey): ProviderConfig {
    const provider = PROVIDER_CONFIGS[key];
    if (!provider) {
      throw new Error(`Provider ${key} not found`);
    }
    return provider;
  }

  /**
   * Get default model for a provider
   */
  static getDefaultModelForProvider(key: ProviderKey): string {
    return this.getProvider(key).defaultModel;
  }

  /**
   * Validate if a model is available for a provider
   */
  static validateModelForProvider(provider: ProviderKey, modelId: string): boolean {
    return this.getProvider(provider).models.some(model => model.id === modelId);
  }

  /**
   * Get provider capabilities
   */
  static getProviderCapabilities(provider: ProviderKey): ProviderCapabilities {
    const providerConfig = this.getProvider(provider);
    const defaultModel = providerConfig.models.find(m => m.id === providerConfig.defaultModel);
    
    if (!defaultModel) {
      throw new Error(`Default model not found for provider ${provider}`);
    }

    return {
      supportsThinking: provider === 'anthropic',
      defaultThinkingModel: provider === 'anthropic' ? providerConfig.defaultModel : undefined,
      maxCompletionTokens: defaultModel.maxCompletionTokens,
      defaultModel: providerConfig.defaultModel
    };
  }
}