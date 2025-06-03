/**
 * This file provides compatibility with the existing store structure
 * while we transition to the new configuration system.
 */
import { ProviderKey } from '../types';

import { DEFAULT_CHAT_CONFIG, DEFAULT_MODEL_CONFIG } from './chat/config';
import { DEFAULT_PROVIDER } from './constants';
import { ModelRegistry } from './models/registry';
import { ProviderRegistry } from './providers/registry';

// Re-export constants and functions needed by the store
export {
  DEFAULT_CHAT_CONFIG,
  DEFAULT_MODEL_CONFIG,
  DEFAULT_PROVIDER
};

// Add type guard for provider key
const isProviderKey = (key: string): key is ProviderKey => 
  key === 'openai' || key === 'anthropic';

// Use type guard before getting provider
const getProviderConfig = (key: string) => {
  if (isProviderKey(key)) {
    return ProviderRegistry.getProvider(key);
  }
  // Default to anthropic if invalid
  return ProviderRegistry.getProvider('anthropic');
};

// Compatibility functions for store
export function getProviderEndpoint(provider: string): string {
  try {
    const providerConfig = getProviderConfig(provider);
    return providerConfig.endpoints[0] || '';
  } catch (e) {
    console.error(`Provider ${provider} not found, using default endpoint`);
    return '/chat/anthropic';
  }
}

export function getModelMaxTokens(modelId: string): number {
  try {
    const capabilities = ModelRegistry.getModelCapabilities(modelId);
    return capabilities.maxResponseTokens;
  } catch (e) {
    console.error(`Model ${modelId} not found, using default max tokens`);
    return 4096;
  }
}