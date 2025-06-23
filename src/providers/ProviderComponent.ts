// This file defines the public API of the Provider component

// Re-export the interfaces
export { AIProviderInterface } from '@src/types/AIProviderInterface';
export { ProviderCapabilities } from './interfaces/ProviderCapabilities';
export { ProviderKey } from './types/ProviderKey';

// Re-export the registry
export { ProviderRegistry } from './ProviderRegistry';

// Factory function (simpler than a class)
export function createProvider(key: ProviderKey): AIProviderInterface {
  return ProviderRegistry.getProvider(key);
}

// Hook that uses this component
export function useProvider(key: ProviderKey): AIProviderInterface {
  // Implementation that uses the component
  return createProvider(key);
}