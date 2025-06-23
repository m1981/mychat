// provider.registry.ts - Registry that works with configurations only
import { ProviderKey, ProviderCapabilities, AIProviderBase } from '@type/provider';
import { ProviderConfig, PROVIDER_CONFIGS } from './provider.config';
import { DEFAULT_PROVIDER } from '@config/chat/ChatConfig';
import { AnthropicProvider } from '@providers/AnthropicProvider';
import { OpenAIProvider } from '@providers/OpenAIProvider';

export class ProviderRegistry {
  // Singleton pattern for provider registry
  private static providers = new Map<ProviderKey, AIProviderBase>();
  
  // Initialize providers
  static {
    try {
      // Create provider instances
      const anthropicProvider = new AnthropicProvider();
      const openaiProvider = new OpenAIProvider();
      
      // Register providers
      ProviderRegistry.providers.set('anthropic', anthropicProvider);
      ProviderRegistry.providers.set('openai', openaiProvider);
    } catch (error) {
      console.error('Error initializing providers:', error);
      // Fallback initialization if constructor approach fails
      ProviderRegistry.initializeProviders();
    }
  }
  
  // Alternative initialization method as fallback
  private static initializeProviders() {
    // Implementation details...
  }
  
  // Get provider implementation - this is the primary method
  static getProvider(key?: ProviderKey): AIProviderBase {
    const providerKey = key || DEFAULT_PROVIDER;
    const implementation = ProviderRegistry.providers.get(providerKey);
    
    if (!implementation) {
      console.error(`Provider implementation for ${providerKey} not found, falling back to default`);
      return ProviderRegistry.providers.get(DEFAULT_PROVIDER) as AIProviderBase;
    }
    
    return implementation;
  }
  
  // Alias for getProvider to maintain backward compatibility
  static getProviderImplementation(key?: ProviderKey): AIProviderBase {
    return ProviderRegistry.getProvider(key);
  }
  
  // Get all available provider keys
  static getAvailableProviders(): ProviderKey[] {
    return Array.from(ProviderRegistry.providers.keys());
  }
  
  // Check if provider exists
  static hasProvider(key: ProviderKey): boolean {
    return ProviderRegistry.providers.has(key);
  }
  
  // Get provider configuration
  static getProviderConfig(key: ProviderKey): ProviderConfig {
    return PROVIDER_CONFIGS[key];
  }
  
  // Get provider capabilities
  static getProviderCapabilities(key: ProviderKey): ProviderCapabilities {
    const provider = ProviderRegistry.getProvider(key);
    return provider.capabilities;
  }
  
  // Register a new provider at runtime
  static registerProvider(key: ProviderKey, provider: AIProviderBase): void {
    ProviderRegistry.providers.set(key, provider);
  }
}