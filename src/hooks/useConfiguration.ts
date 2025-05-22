import { useState, useEffect, useCallback } from 'react';
import { configService } from '@services/ConfigurationService';
import { ChatConfig, ChatConfigUpdate, ModelConfig, ModelConfigUpdate } from '@config/types';
import useStore from '@store/store';

/**
 * Hook for accessing and modifying global default configuration
 */
export function useDefaultConfig() {
  const [config, setConfig] = useState<ChatConfig>(configService.getDefaultConfig());
  const storeConfig = useStore(state => state.defaultChatConfig);
  
  // Update local state when store changes
  useEffect(() => {
    setConfig(storeConfig);
  }, [storeConfig]);
  
  // Update methods
  const updateConfig = useCallback((update: ChatConfigUpdate) => {
    configService.updateDefaultConfig(update);
  }, []);
  
  const updateModelConfig = useCallback((update: ModelConfigUpdate) => {
    updateConfig({ modelConfig: { ...config.modelConfig, ...update } });
  }, [config.modelConfig]);
  
  const updateCapability = useCallback((
    capability: string, 
    update: any
  ) => {
    const currentCapabilities = config.modelConfig.capabilities || {};
    
    updateModelConfig({
      capabilities: {
        ...currentCapabilities,
        [capability]: {
          ...(currentCapabilities[capability] || {}),
          ...update
        }
      }
    });
  }, [config.modelConfig, updateModelConfig]);
  
  return {
    config,
    updateConfig,
    updateModelConfig,
    updateCapability
  };
}

/**
 * Hook for accessing and modifying chat-specific configuration
 */
export function useChatConfig(chatId: string) {
  const [config, setConfig] = useState<ChatConfig | null>(null);
  const chat = useStore(state => 
    state.chats.find(c => c.id === chatId)
  );
  
  // Load config when chat changes
  useEffect(() => {
    if (chat) {
      setConfig(chat.config);
    }
  }, [chat]);
  
  // Update methods
  const updateConfig = useCallback((update: ChatConfigUpdate) => {
    if (!chatId) return;
    configService.updateChatConfig(chatId, update);
  }, [chatId]);
  
  const updateModelConfig = useCallback((update: ModelConfigUpdate) => {
    if (!config) return;
    updateConfig({ modelConfig: { ...config.modelConfig, ...update } });
  }, [config, updateConfig]);
  
  const updateCapability = useCallback((
    capability: string, 
    update: any
  ) => {
    if (!config) return;
    const currentCapabilities = config.modelConfig.capabilities || {};
    
    updateModelConfig({
      capabilities: {
        ...currentCapabilities,
        [capability]: {
          ...(currentCapabilities[capability] || {}),
          ...update
        }
      }
    });
  }, [config, updateModelConfig]);
  
  return {
    config,
    updateConfig,
    updateModelConfig,
    updateCapability,
    isLoading: !config
  };
}

/**
 * Hook to check if a capability is supported
 */
export function useCapabilitySupport(
  capability: string,
  provider?: ProviderKey,
  model?: string
) {
  const defaultConfig = useStore(state => state.defaultChatConfig);
  
  const effectiveProvider = provider || defaultConfig.provider;
  const effectiveModel = model || defaultConfig.modelConfig.model;
  
  return configService.isCapabilitySupported(
    capability,
    effectiveProvider,
    effectiveModel
  );
}