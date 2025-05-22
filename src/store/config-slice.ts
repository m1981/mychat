import { StateCreator } from 'zustand';
import { ConfigSlice, StoreState } from './types';
import { ProviderRegistry } from '@config/providers/provider.registry';
import { ChatConfig, ProviderKey } from '@type/chat';
import { Theme } from '@type/theme';
import { debug } from '@utils/debug';

export type LayoutWidth = 'normal' | 'wide';

export const createConfigSlice: StateCreator<StoreState, [], [], ConfigSlice> = (set, get) => ({
  openConfig: false,
  theme: 'dark',
  hideMenuOptions: false,
  hideSideMenu: false,
  autoTitle: true,
  enterToSubmit: true,
  layoutWidth: 'normal',
  defaultChatConfig: {
    provider: 'anthropic',
    modelConfig: {
      model: 'claude-3-7-sonnet-20250219',
      max_tokens: 4096,
      temperature: 0.7,
      capabilities: {}
    },
    systemPrompt: 'Be my helpful and honest advisor.'
  },
  defaultSystemMessage: 'Be my helpful and honest advisor.',
  
  setOpenConfig: (openConfig: boolean) => {
    set({ openConfig });
  },
  
  setTheme: (theme: Theme) => {
    set({ theme });
  },
  
  setAutoTitle: (autoTitle: boolean) => {
    set({ autoTitle });
  },
  
  setDefaultChatConfig: (config: Partial<ChatConfig>) => {
    debug.log('store', 'Setting default chat config:', config);
    
    // Get current config
    const currentConfig = get().defaultChatConfig;
    
    // Handle provider change - update model if provider changes
    if (config.provider && config.provider !== currentConfig.provider) {
      debug.log('store', `Provider changed from ${currentConfig.provider} to ${config.provider}`);
      
      try {
        // Get default model for the new provider
        const defaultModel = ProviderRegistry.getDefaultModelForProvider(config.provider);
        debug.log('store', `Default model for ${config.provider}: ${defaultModel}`);
        
        // Update model in the config
        if (!config.modelConfig) {
          config.modelConfig = { ...currentConfig.modelConfig, model: defaultModel };
        } else {
          config.modelConfig.model = defaultModel;
        }
      } catch (error) {
        debug.error('store', `Error getting default model for provider ${config.provider}:`, error);
      }
    }
    
    // Create a new config object
    const newConfig = { ...currentConfig };
    
    // Update provider if specified
    if (config.provider) {
      newConfig.provider = config.provider;
    }
    
    // Update modelConfig if specified
    if (config.modelConfig) {
      // If model is specified in the update, it overrides the default model
      newConfig.modelConfig = {
        ...newConfig.modelConfig,
        ...config.modelConfig
      };
      
      // Ensure capabilities is an object, not an array
      if (Array.isArray(newConfig.modelConfig.capabilities)) {
        debug.log('store', 'WARN: Converting capabilities array to object');
        newConfig.modelConfig.capabilities = {};
      }
      
      // Merge capabilities
      if (currentConfig.modelConfig?.capabilities && newConfig.modelConfig.capabilities) {
        newConfig.modelConfig.capabilities = {
          ...(currentConfig.modelConfig.capabilities || {}),
          ...(newConfig.modelConfig.capabilities || {})
        };
      }
    }
    
    // Update systemPrompt if specified
    if (config.systemPrompt) {
      newConfig.systemPrompt = config.systemPrompt;
    }
    
    debug.log('store', 'New default chat config:', newConfig);
    
    // Update the store
    set({ defaultChatConfig: newConfig });
  },
  
  setProvider: (provider: ProviderKey) => {
    const { setDefaultChatConfig } = get();
    setDefaultChatConfig({ provider });
  },
  
  setDefaultSystemMessage: (defaultSystemMessage: string) => {
    set({ defaultSystemMessage });
  },
  
  setHideMenuOptions: (hideMenuOptions: boolean) => {
    set({ hideMenuOptions });
  },
  
  setHideSideMenu: (hideSideMenu: boolean) => {
    set({ hideSideMenu });
  },
  
  setEnterToSubmit: (enterToSubmit: boolean) => {
    set({ enterToSubmit });
  },
  
  setLayoutWidth: (layoutWidth: LayoutWidth) => {
    set({ layoutWidth });
  },
});