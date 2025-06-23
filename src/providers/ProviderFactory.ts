import { ProviderKey, AIProviderBase } from '@type/provider';
import { ProviderRegistry } from '@config/providers/provider.registry';

/**
 * Factory for creating provider instances
 * @deprecated Use ProviderRegistry.getProviderImplementation() directly instead
 */
export class ProviderFactory {
  /**
   * Creates a provider instance for the given key
   * @deprecated Use ProviderRegistry.getProviderImplementation() instead
   */
  static createProvider(key: ProviderKey): AIProviderBase {
    console.warn(
      '[DEPRECATED] ProviderFactory.createProvider is deprecated. ' +
      `Use ProviderRegistry.getProviderImplementation('${key}') instead.`
    );
    return ProviderRegistry.getProviderImplementation(key);
  }
  
  /**
   * Register a new provider type at runtime
   */
  static registerProviderType(
    key: ProviderKey, 
    factory: () => AIProviderBase
  ): void {
    ProviderRegistry.registerProvider(key, factory());
  }
}