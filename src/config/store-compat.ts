/**
 * This file provides compatibility with the existing store structure
 * while we transition to the new configuration system.
 */
import { DEFAULT_CHAT_CONFIG, DEFAULT_MODEL_CONFIG } from './chat/config';
import { ProviderRegistry } from './providers/registry';
import { ModelRegistry } from './models/registry';
import { DEFAULT_PROVIDER } from './constants';

// Re-export constants and functions needed by the store
export {
  DEFAULT_CHAT_CONFIG,
  DEFAULT_MODEL_CONFIG,
  DEFAULT_PROVIDER
};

// Compatibility functions for store
export function getProviderEndpoint(provider: string): string {
  try {
    const providerConfig = ProviderRegistry.getProvider(provider);
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