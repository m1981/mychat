import { useCallback } from 'react';
import { capabilityRegistry } from '@capabilities/registry';
import { ProviderKey } from '@type/chat';
import { ModelConfig } from '@type/config';
import useStore from '@store/store';

/**
 * Hook to get capability components for a provider/model
 */
export function useCapabilityComponents(
  provider: ProviderKey,
  model: string,
  modelConfig: ModelConfig,
  setModelConfig: (config: ModelConfig) => void
) {
  return capabilityRegistry.getCapabilityComponents(
    provider,
    model,
    modelConfig,
    setModelConfig
  );
}

/**
 * Hook to update a specific capability configuration
 */
export function useCapabilityConfig(chatId: string, capabilityId: string) {
  const updateCapabilityConfig = useStore(state => state.updateCapabilityConfig);
  
  const updateConfig = useCallback((config: any) => {
    updateCapabilityConfig(chatId, capabilityId, config);
  }, [chatId, capabilityId, updateCapabilityConfig]);
  
  return { updateConfig };
}