import { ProviderKey } from '@type/chat';
import { PROVIDER_CONFIGS } from './provider.config';
import { debug } from '@utils/debug';

export class ProviderRegistry {
  /**
   * Get all available providers
   * @returns Record of provider keys to provider configs
   */
  static getProviders() {
    debug.log('ui', 'ProviderRegistry.getProviders called');
    return PROVIDER_CONFIGS;
  }
  
  /**
   * Get a specific provider by key
   * @param key Provider key
   * @returns Provider config
   */
  static getProvider(key: ProviderKey) {
    debug.log('ui', `ProviderRegistry.getProvider called for "${key}"`);
    
    if (!key) {
      debug.error('ui', 'ProviderRegistry.getProvider called with null/undefined key');
      throw new Error('Provider key is required');
    }
    
    const provider = PROVIDER_CONFIGS[key];
    
    if (!provider) {
      debug.error('ui', `Provider "${key}" not found in registry`);
      throw new Error(`Provider "${key}" not found`);
    }
    
    return provider;
  }
  
  /**
   * Get provider capabilities
   * @param key Provider key
   * @returns Provider capabilities
   */
  static getProviderCapabilities(key: ProviderKey) {
    debug.log('ui', `ProviderRegistry.getProviderCapabilities called for "${key}"`);
    
    const provider = this.getProvider(key);
    return provider.capabilities;
  }
  
  /**
   * Get all providers as a property
   */
  static get providers() {
    debug.log('ui', 'ProviderRegistry.providers getter called');
    return PROVIDER_CONFIGS;
  }
}