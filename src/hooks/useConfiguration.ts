import { useState, useEffect, useCallback } from 'react';
import { capabilityRegistry } from '@capabilities/registry';
import { ChatConfig, ModelConfig } from '@types/config';
import { ProviderKey } from '@types/chat';
import useStore from '@store/store';
import { debug } from '@utils/debug';

/**
 * Helper function to merge configurations
 */
function mergeConfigs(current: any, update: any): any {
  debug.log('ui', 'mergeConfigs called with:', { current, update });
  
  if (!update) {
    debug.log('ui', 'mergeConfigs: update is null/undefined, returning current');
    return current;
  }
  
  if (!current) {
    debug.log('ui', 'mergeConfigs: current is null/undefined, returning update');
    return update;
  }
  
  const result = { ...current };
  
  Object.keys(update).forEach(key => {
    const updateValue = update[key];
    
    if (updateValue !== undefined) {
      if (
        typeof result[key] === 'object' && 
        result[key] !== null &&
        typeof updateValue === 'object' && 
        updateValue !== null &&
        !Array.isArray(result[key]) &&
        !Array.isArray(updateValue)
      ) {
        // Deep merge objects
        debug.log('ui', `mergeConfigs: deep merging key "${key}"`);
        result[key] = mergeConfigs(result[key], updateValue);
      } else {
        // Replace value
        debug.log('ui', `mergeConfigs: replacing key "${key}"`);
        result[key] = updateValue;
      }
    }
  });
  
  debug.log('ui', 'mergeConfigs result:', result);
  return result;
}

/**
 * Hook for accessing and modifying global default configuration
 */
export function useDefaultConfig() {
  debug.log('ui', 'useDefaultConfig called');
  
  // Get state from store
  const defaultConfig = useStore(state => {
    debug.log('ui', 'useDefaultConfig: getting defaultChatConfig from store', state.defaultChatConfig);
    return state.defaultChatConfig;
  });
  
  const setDefaultConfig = useStore(state => state.setDefaultChatConfig);
  const defaultSystemMessage = useStore(state => state.defaultSystemMessage);
  const setDefaultSystemMessage = useStore(state => state.setDefaultSystemMessage);
  
  // Local state
  const [isLoading, setIsLoading] = useState(true);
  const [config, setConfig] = useState(defaultConfig);
  const [systemMessage, setSystemMessage] = useState(defaultSystemMessage || '');
  
  // Initialize local state when store values change
  useEffect(() => {
    debug.log('ui', 'useDefaultConfig: store values changed', { 
      defaultConfig, 
      defaultSystemMessage 
    });
    
    setConfig(defaultConfig);
    setSystemMessage(defaultSystemMessage || '');
    setIsLoading(false);
  }, [defaultConfig, defaultSystemMessage]);
  
  // Update methods - always define these, never conditionally
  const updateConfig = useCallback((update) => {
    debug.log('ui', 'updateConfig called with:', update);
    
    if (!config) {
      debug.error('ui', 'updateConfig: config is null/undefined');
      return;
    }
    
    const newConfig = mergeConfigs(config, update);
    debug.log('ui', 'updateConfig: setting new config', newConfig);
    setDefaultConfig(newConfig);
  }, [config, setDefaultConfig]);
  
  const updateModelConfig = useCallback((update) => {
    debug.log('ui', 'updateModelConfig called with:', update);
    
    if (!config) {
      debug.error('ui', 'updateModelConfig: config is null/undefined');
      return;
    }
    
    updateConfig({ modelConfig: mergeConfigs(config.modelConfig, update) });
  }, [config, updateConfig]);
  
  const updateCapability = useCallback((capability, update) => {
    debug.log('ui', `updateCapability called for "${capability}" with:`, update);
    
    if (!config) {
      debug.error('ui', 'updateCapability: config is null/undefined');
      return;
    }
    
    const currentCapabilities = config.modelConfig.capabilities || {};
    updateModelConfig({
      capabilities: {
        ...currentCapabilities,
        [capability]: mergeConfigs(currentCapabilities[capability] || {}, update)
      }
    });
  }, [config, updateModelConfig]);
  
  const updateSystemMessage = useCallback((message) => {
    debug.log('ui', 'updateSystemMessage called with:', message);
    setDefaultSystemMessage(message);
  }, [setDefaultSystemMessage]);
  
  // Log the final return value
  const returnValue = {
    config,
    systemMessage,
    isLoading,
    updateConfig,
    updateModelConfig,
    updateCapability,
    updateSystemMessage
  };
  
  debug.log('ui', 'useDefaultConfig returning:', returnValue);
  
  return returnValue;
}

/**
 * Hook for accessing and modifying chat-specific configuration
 */
export function useChatConfig(chatId) {
  debug.log('ui', `useChatConfig called for chat: ${chatId}`);
  
  // Get state from store
  const chats = useStore(state => state.chats);
  const updateChat = useStore(state => state.updateChat);
  
  // Local state - always initialize these
  const [config, setConfig] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Load config when chat changes
  useEffect(() => {
    debug.log('ui', `useChatConfig: loading config for chat ${chatId}`);
    setIsLoading(true);
    
    const chat = chats.find(c => c.id === chatId);
    debug.log('ui', `useChatConfig: found chat:`, chat);
    
    if (chat) {
      debug.log('ui', `useChatConfig: setting config from chat:`, chat.config);
      setConfig(chat.config);
    } else {
      debug.log('ui', `useChatConfig: chat not found, setting config to null`);
      setConfig(null);
    }
    
    setIsLoading(false);
  }, [chatId, chats]);
  
  // Update methods - always define these, never conditionally
  const updateConfig = useCallback((update) => {
    debug.log('ui', `updateConfig called for chat ${chatId} with:`, update);
    
    if (!config || !chatId) {
      debug.error('ui', 'updateConfig: config or chatId is null/undefined');
      return;
    }
    
    const chatIndex = chats.findIndex(c => c.id === chatId);
    if (chatIndex === -1) {
      debug.error('ui', `updateConfig: chat with id ${chatId} not found`);
      return;
    }
    
    const newConfig = mergeConfigs(config, update);
    debug.log('ui', `updateConfig: updating chat at index ${chatIndex} with new config:`, newConfig);
    updateChat(chatIndex, { config: newConfig });
  }, [chatId, config, chats, updateChat]);
  
  const updateModelConfig = useCallback((update) => {
    debug.log('ui', `updateModelConfig called for chat ${chatId} with:`, update);
    
    if (!config) {
      debug.error('ui', 'updateModelConfig: config is null/undefined');
      return;
    }
    
    updateConfig({ modelConfig: mergeConfigs(config.modelConfig, update) });
  }, [chatId, config, updateConfig]);
  
  const updateCapability = useCallback((capability, update) => {
    debug.log('ui', `updateCapability called for chat ${chatId}, capability "${capability}" with:`, update);
    
    if (!config) {
      debug.error('ui', 'updateCapability: config is null/undefined');
      return;
    }
    
    const currentCapabilities = config.modelConfig.capabilities || {};
    updateModelConfig({
      capabilities: {
        ...currentCapabilities,
        [capability]: mergeConfigs(currentCapabilities[capability] || {}, update)
      }
    });
  }, [chatId, config, updateModelConfig]);
  
  // Log the final return value
  const returnValue = {
    config,
    isLoading,
    updateConfig,
    updateModelConfig,
    updateCapability
  };
  
  debug.log('ui', `useChatConfig for ${chatId} returning:`, returnValue);
  
  return returnValue;
}

/**
 * Hook to check if a capability is supported
 */
export function useCapabilitySupport(capability, provider, model) {
  debug.log('ui', `useCapabilitySupport called for capability "${capability}", provider "${provider}", model "${model}"`);
  
  // Always return a boolean, never undefined
  if (!capability || !provider || !model) {
    debug.log('ui', `useCapabilitySupport: missing required parameters, returning false`);
    return false;
  }
  
  try {
    // Map capability IDs if needed
    const capabilityId = (() => {
      // Map from API capability names to registry capability names
      const capabilityMap = {
        'thinking_mode': 'thinking',
        'file_upload': 'fileUpload'
      };
      
      return capabilityMap[capability] || capability;
    })();
    
    debug.log('ui', `useCapabilitySupport: mapped capability "${capability}" to "${capabilityId}"`);
    
    // Check if capability is supported
    const isSupported = capabilityRegistry.isCapabilitySupported(capabilityId, provider, model);
    debug.log('ui', `useCapabilitySupport: capability "${capabilityId}" is ${isSupported ? 'supported' : 'not supported'}`);
    return isSupported;
  } catch (error) {
    debug.error('ui', `useCapabilitySupport: error checking capability "${capability}":`, error);
    return false;
  }
}