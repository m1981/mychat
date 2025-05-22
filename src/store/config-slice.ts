import { StateCreator } from 'zustand';
import { ConfigSlice, StoreState } from './types';
import { createDefaultChatConfig, DEFAULT_SYSTEM_MESSAGE } from '@config/defaults/ChatDefaults';
import { ProviderRegistry } from '@config/providers/provider.registry';
import { ChatConfig } from '@type/config';
import { debug } from '@utils/debug';

export type LayoutWidth = 'normal' | 'wide';

export interface ConfigSlice {
  openConfig: boolean;
  theme: Theme;
  autoTitle: boolean;
  hideMenuOptions: boolean;
  defaultChatConfig: ChatConfig;
  defaultSystemMessage: string;
  hideSideMenu: boolean;
  enterToSubmit: boolean;
  layoutWidth: LayoutWidth;
  setOpenConfig: (openConfig: boolean) => void;
  setTheme: (theme: Theme) => void;
  setAutoTitle: (autoTitle: boolean) => void;
  setProvider: (provider: ProviderKey) => void;
  setDefaultChatConfig: (config: ChatConfig) => void;
  setDefaultSystemMessage: (defaultSystemMessage: string) => void;
  setHideMenuOptions: (hideMenuOptions: boolean) => void;
  setHideSideMenu: (hideSideMenu: boolean) => void;
  setEnterToSubmit: (enterToSubmit: boolean) => void;
  setLayoutWidth: (width: LayoutWidth) => void;

}

export const createConfigSlice: StateCreator<StoreState, [], [], ConfigSlice> = (set, get) => ({
  openConfig: false,
  theme: 'dark',
  hideMenuOptions: false,
  hideSideMenu: false,
  autoTitle: true,
  enterToSubmit: true,
  layoutWidth: 'normal',
  defaultChatConfig: createDefaultChatConfig(),
  defaultSystemMessage: DEFAULT_SYSTEM_MESSAGE,
  setOpenConfig: (openConfig: boolean) => {
    set((prev: ConfigSlice) => ({
      ...prev,
      openConfig: openConfig,
    }));
  },
  setTheme: (theme: Theme) => {
    set((prev: ConfigSlice) => ({
      ...prev,
      theme: theme,
    }));
  },
  setAutoTitle: (autoTitle: boolean) => {
    set((prev: ConfigSlice) => ({
      ...prev,
      autoTitle: autoTitle,
    }));
  },
  setDefaultChatConfig: (config: Partial<ChatConfig>) => {
    debug.log('store', 'Setting default chat config:', config);
    
    // Get current config
    const currentConfig = get().defaultChatConfig;
    
    // Create a new config object to avoid mutation issues
    let newConfig = { ...currentConfig };
    
    // Handle provider change - update model if provider changes
    if (config.provider && config.provider !== currentConfig.provider) {
      debug.log('store', `Provider changed from ${currentConfig.provider} to ${config.provider}`);
      
      try {
        // Get default model for the new provider
        const defaultModel = ProviderRegistry.getDefaultModelForProvider(config.provider);
        debug.log('store', `Default model for ${config.provider}: ${defaultModel}`);
        
        // Create new modelConfig with updated model
        newConfig = {
          ...newConfig,
          provider: config.provider,
          modelConfig: {
            ...newConfig.modelConfig,
            model: defaultModel,
            ...(config.modelConfig || {})
          }
        };
        
        // If the user explicitly provided a model, use that instead
        if (config.modelConfig?.model) {
          newConfig.modelConfig.model = config.modelConfig.model;
        }
      } catch (error) {
        debug.error('store', `Error getting default model for provider ${config.provider}:`, error);
      }
    } else {
      // No provider change, just merge the configs
      newConfig = {
        ...newConfig,
        ...config,
        modelConfig: {
          ...newConfig.modelConfig,
          ...(config.modelConfig || {})
        }
      };
    }
    
    // Ensure capabilities is an object, not an array
    if (newConfig.modelConfig?.capabilities && Array.isArray(newConfig.modelConfig.capabilities)) {
      debug.warn('store', 'Converting capabilities array to object');
      newConfig.modelConfig.capabilities = {};
    }
    
    // Merge capabilities
    if (newConfig.modelConfig && currentConfig.modelConfig?.capabilities) {
      newConfig.modelConfig.capabilities = {
        ...(currentConfig.modelConfig.capabilities || {}),
        ...(newConfig.modelConfig.capabilities || {})
      };
    }
    
    debug.log('store', 'New default chat config:', newConfig);
    
    set({ defaultChatConfig: newConfig });
  },
  setProvider: (provider: ProviderKey) => {
    set((prev) => ({
      ...prev,
      defaultChatConfig: {
        ...prev.defaultChatConfig,
        provider,
      },
    }));
  },
  setDefaultSystemMessage: (defaultSystemMessage: string) => {
    set((prev: ConfigSlice) => ({
      ...prev,
      defaultSystemMessage: defaultSystemMessage,
    }));
  },
  setHideMenuOptions: (hideMenuOptions: boolean) => {
    set((prev: ConfigSlice) => ({
      ...prev,
      hideMenuOptions: hideMenuOptions,
    }));
  },
  setHideSideMenu: (hideSideMenu: boolean) => {
    set((prev: ConfigSlice) => ({
      ...prev,
      hideSideMenu: hideSideMenu,
    }));
  },
  setEnterToSubmit: (enterToSubmit: boolean) => {
    set((prev: ConfigSlice) => ({
      ...prev,
      enterToSubmit: enterToSubmit,
    }));
  },
  setLayoutWidth: (layoutWidth: LayoutWidth) => {
    set((prev: ConfigSlice) => ({
      ...prev,
      layoutWidth,
    }));
  },
});
