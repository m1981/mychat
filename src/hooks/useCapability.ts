import { useCallback, useMemo } from 'react';
import useStore from '@store/store';
import { CapabilityContext } from '@type/capability';
import { configurationService } from '@services/ConfigurationService';

// Simple hook for capability management
export function useCapability(capabilityId: string, chatId?: string) {
  // Get current chat ID if not provided
  const id = useChatId(chatId);
  
  // Get capability enabled state with memoization
  const isEnabled = useStore(
    state => {
      const config = state.getChatConfig(id);
      return !!config.modelConfig.capabilities?.[capabilityId]?.enabled;
    }
  );
  
  // Get capability configuration with memoization
  const config = useStore(
    state => {
      const chatConfig = state.getChatConfig(id);
      return chatConfig.modelConfig.capabilities?.[capabilityId] || null;
    }
  );
  
  // Check if capability is supported
  const isSupported = useMemo(() => {
    const chatConfig = useStore.getState().getChatConfig(id);
    return configurationService.isCapabilitySupported(
      capabilityId,
      chatConfig.provider,
      chatConfig.modelConfig.model
    );
  }, [id, capabilityId]);
  
  // Toggle capability
  const toggleCapability = useCallback(() => {
    try {
      configurationService.updateCapabilityConfig(
        id,
        capabilityId,
        { enabled: !isEnabled }
      );
    } catch (error) {
      // Handle error
      console.error(`Error toggling capability ${capabilityId}:`, error);
    }
  }, [id, capabilityId, isEnabled]);
  
  // Update capability config
  const updateConfig = useCallback((update: any) => {
    try {
      configurationService.updateCapabilityConfig(
        id,
        capabilityId,
        update
      );
    } catch (error) {
      // Handle error
      console.error(`Error updating capability ${capabilityId}:`, error);
    }
  }, [id, capabilityId]);
  
  return {
    isEnabled,
    isSupported,
    config,
    toggleCapability,
    updateConfig
  };
}