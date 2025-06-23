
import { ProviderKey, AIProviderBase } from './provider';
import { ProviderRegistry } from '@config/providers/provider.registry';

/**
 * @deprecated Use ProviderRegistry.getProvider() instead.
 * This will be removed in a future version.
 * 
 * Example:
 * // Old way:
 * import { providers } from '@type/providers';
 * const provider = providers[providerKey];
 * 
 * // New way:
 * import { ProviderRegistry } from '@config/providers/provider.registry';
 * const provider = ProviderRegistry.getProvider(providerKey);
 */
export const providers: Record<ProviderKey, AIProviderBase> = new Proxy({} as Record<ProviderKey, AIProviderBase>, {
  get: (target, prop) => {
    console.warn(
      `[DEPRECATED] Direct access to providers is deprecated. ` +
      `Use ProviderRegistry.getProvider('${String(prop)}') instead.`
    );
    return ProviderRegistry.getProvider(prop as ProviderKey);
  }
});