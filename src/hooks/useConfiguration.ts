import { useCallback, useMemo } from 'react';
import useStore from '@store/store';
import { ChatConfig, ChatConfigUpdate, ModelConfig } from '@config/types';
import { ProviderKey } from '@type/chat';

/**
 * Hook for accessing and updating global configuration
 */
export function useConfiguration() {
  // Get default configuration from store
  const defaultConfig = useStore(state => state.defaultChatConfig);
  
  // Update default configuration
  const updateDefaultConfig = useCallback((update: ChatConfigUpdate) => {
    useStore.getState().updateDefaultChatConfig(update);
  }, []);
  
  // Update default model configuration (convenience method)
  const updateDefaultModelConfig = useCallback((update: Partial<ModelConfig>) => {
    useStore.getState().updateDefaultChatConfig({ modelConfig: update });
  }, []);
  
  // Get chat configuration
  const getChatConfig = useCallback((chatId: string): ChatConfig => {
    return useStore.getState().getChatConfig(chatId);
  }, []);
  
  // Update chat configuration
  const updateChatConfig = useCallback((chatId: string, update: ChatConfigUpdate) => {
    useStore.getState().updateChatConfig(chatId, update);
  }, []);
  
  // Reset chat configuration to default
  const resetChatConfig = useCallback((chatId: string) => {
    useStore.getState().resetChatConfig(chatId);
  }, []);
  
  // Check if capability is enabled
  const isCapabilityEnabled = useCallback((chatId: string, capabilityId: string): boolean => {
    return useStore.getState().isCapabilityEnabled(chatId, capabilityId);
  }, []);
  
  // Update capability configuration
  const updateCapabilityConfig = useCallback(
    (chatId: string, capabilityId: string, config: any) => {
      useStore.getState().updateCapabilityConfig(chatId, capabilityId, config);
    }, 
    []
  );
  
  // Set provider (convenience method)
  const setProvider = useCallback((provider: ProviderKey) => {
    updateDefaultConfig({ provider });
  }, [updateDefaultConfig]);
  
  return {
    defaultConfig,
    updateDefaultConfig,
    updateDefaultModelConfig,
    getChatConfig,
    updateChatConfig,
    resetChatConfig,
    isCapabilityEnabled,
    updateCapabilityConfig,
    setProvider
  };
}

/**
 * Hook for accessing and updating a specific chat's configuration
 * @param chatId - ID of the chat
 */
export function useChatConfig(chatId: string) {
  // Get chat configuration
  const config = useStore(
    state => state.getChatConfig(chatId)
  );
  
  // Update chat configuration
  const updateConfig = useCallback((update: ChatConfigUpdate) => {
    useStore.getState().updateChatConfig(chatId, update);
  }, [chatId]);
  
  // Update model configuration (convenience method)
  const updateModelConfig = useCallback((update: Partial<ModelConfig>) => {
    useStore.getState().updateChatConfig(chatId, { modelConfig: update });
  }, [chatId]);
  
  // Reset chat configuration to default
  const resetConfig = useCallback(() => {
    useStore.getState().resetChatConfig(chatId);
  }, [chatId]);
  
  // Check if capability is enabled
  const isCapabilityEnabled = useCallback((capabilityId: string): boolean => {
    return useStore.getState().isCapabilityEnabled(chatId, capabilityId);
  }, [chatId]);
  
  // Update capability configuration
  const updateCapabilityConfig = useCallback(
    (capabilityId: string, config: any) => {
      useStore.getState().updateCapabilityConfig(chatId, capabilityId, config);
    }, 
    [chatId]
  );
  
  // Toggle capability enabled state (convenience method)
  const toggleCapability = useCallback((capabilityId: string) => {
    const isEnabled = useStore.getState().isCapabilityEnabled(chatId, capabilityId);
    updateCapabilityConfig(capabilityId, { enabled: !isEnabled });
  }, [chatId, updateCapabilityConfig]);
  
  return {
    config,
    updateConfig,
    updateModelConfig,
    resetConfig,
    isCapabilityEnabled,
    updateCapabilityConfig,
    toggleCapability
  };
}

/**
 * Hook for accessing and updating a specific model parameter
 * @param paramName - Name of the parameter (e.g., 'temperature')
 * @param chatId - Optional chat ID (uses current chat if not provided)
 */
export function useModelParameter<K extends keyof ModelConfig>(
  paramName: K,
  chatId?: string
) {
  // Get current chat ID if not provided
  const currentChatId = useStore(state => {
    if (chatId) return chatId;
    const { chats, currentChatIndex } = state;
    return chats[currentChatIndex]?.id;
  });
  
  // Get parameter value
  const value = useStore(
    state => state.getChatConfig(currentChatId).modelConfig[paramName]
  );
  
  // Update parameter value
  const setValue = useCallback((newValue: ModelConfig[K]) => {
    useStore.getState().updateChatConfig(currentChatId, {
      modelConfig: { [paramName]: newValue } as Partial<ModelConfig>
    });
  }, [currentChatId, paramName]);
  
  return [value, setValue] as const;
}

// Convenience hooks for common parameters
export function useTemperature(chatId?: string) {
  return useModelParameter('temperature', chatId);
}

export function useMaxTokens(chatId?: string) {
  return useModelParameter('max_tokens', chatId);
}

export function useTopP(chatId?: string) {
  return useModelParameter('top_p', chatId);
}