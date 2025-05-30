import { ProviderKey } from '../types';

/**
 * Type guard for ProviderKey
 * @param key String to check
 * @returns Boolean indicating if key is a valid ProviderKey
 */
export const isProviderKey = (key: string): key is ProviderKey => 
  key === 'openai' || key === 'anthropic';

/**
 * Get default provider if key is invalid
 * @param key Provider key to check
 * @returns Valid ProviderKey (defaulting to 'anthropic' if invalid)
 */
export const getSafeProviderKey = (key: string): ProviderKey => 
  isProviderKey(key) ? key : 'anthropic';