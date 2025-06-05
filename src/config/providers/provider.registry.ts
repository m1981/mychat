// provider.registry.ts - Registry that works with configurations only
import { ProviderKey, ProviderCapabilities, AIProviderInterface } from '@type/provider';
import { ProviderConfig, PROVIDER_CONFIGS } from './provider.config';
import { providers } from '@type/providers';
import { DEFAULT_PROVIDER } from '@config/chat/ChatConfig';

export class ProviderRegistry {
  static getProvider(key?: ProviderKey): ProviderConfig {
    // Use default provider if key is undefined
    const providerKey = key || DEFAULT_PROVIDER;
    const provider = PROVIDER_CONFIGS[providerKey];
    if (!provider) {
      console.error(`Provider ${providerKey} not found, falling back to default`);
      return PROVIDER_CONFIGS[DEFAULT_PROVIDER];
    }
    return provider;
  }

  static getDefaultModelForProvider(key?: ProviderKey): string {
    return this.getProvider(key).defaultModel;
  }

  static validateModelForProvider(provider?: ProviderKey, modelId?: string): boolean {
    if (!modelId) return false;
    return this.getProvider(provider).models.some(model => model.id === modelId);
  }

  static getProviderCapabilities(provider?: ProviderKey): ProviderCapabilities {
    const providerConfig = this.getProvider(provider);
    const defaultModel = providerConfig.models.find(m => m.id === providerConfig.defaultModel);
    
    if (!defaultModel) {
      console.error(`Default model not found for provider ${provider}, using fallback values`);
      return {
        supportsThinking: false,
        maxCompletionTokens: 4096,
        defaultModel: providerConfig.defaultModel || 'unknown'
      };
    }

    const capabilities: ProviderCapabilities = {
      supportsThinking: providerConfig.capabilities.supportsThinking,
      maxCompletionTokens: defaultModel.maxCompletionTokens,
      defaultModel: providerConfig.defaultModel
    };
    
    // Add thinking-specific capabilities if supported
    if (capabilities.supportsThinking) {
      capabilities.defaultThinkingModel = providerConfig.defaultModel;
    }
    
    return capabilities;
  }

  static getProviderImplementation(key?: ProviderKey): AIProviderInterface {
    const providerKey = key || DEFAULT_PROVIDER;
    const implementation = providers[providerKey];
    if (!implementation) {
      console.error(`Provider implementation for ${providerKey} not found, falling back to default`);
      return providers[DEFAULT_PROVIDER];
    }
    return implementation;
  }
  
  static getApiEndpoint(key?: ProviderKey): string {
    const provider = this.getProvider(key);
    if (!provider.endpoints || provider.endpoints.length === 0) {
      console.error(`No endpoints configured for provider ${key}, using fallback`);
      return '/api/chat/fallback';
    }
    return provider.endpoints[0];
  }
}