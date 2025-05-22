import { StateCreator } from 'zustand';
import { DEFAULT_CHAT_CONFIG } from '@config/chat/ChatConfig';
import { ChatConfig, ChatConfigUpdate } from '@config/types';
import { ChatInterface } from '@type/chat';

export interface ConfigSlice {
  // Global default configuration
  defaultChatConfig: ChatConfig;
  
  // Actions
  setDefaultChatConfig: (config: ChatConfig) => void;
  updateDefaultChatConfig: (update: ChatConfigUpdate) => void;
  
  // Chat-specific configuration actions
  getChatConfig: (chatId: string) => ChatConfig;
  updateChatConfig: (chatId: string, update: ChatConfigUpdate) => void;
  resetChatConfig: (chatId: string) => void;
  
  // Capability-specific actions
  isCapabilityEnabled: (chatId: string, capabilityId: string) => boolean;
  updateCapabilityConfig: (chatId: string, capabilityId: string, config: any) => void;
}

export const createConfigSlice: StateCreator<
  ConfigSlice & { chats: ChatInterface[] },
  [],
  [],
  ConfigSlice
> = (set, get) => ({
  // Initial state
  defaultChatConfig: DEFAULT_CHAT_CONFIG,
  
  // Actions
  setDefaultChatConfig: (config: ChatConfig) => 
    set({ defaultChatConfig: config }),
    
  updateDefaultChatConfig: (update: ChatConfigUpdate) => {
    const current = get().defaultChatConfig;
    set({ 
      defaultChatConfig: {
        ...current,
        ...update,
        modelConfig: {
          ...current.modelConfig,
          ...(update.modelConfig || {}),
          capabilities: {
            ...(current.modelConfig.capabilities || {}),
            ...(update.modelConfig?.capabilities || {})
          }
        }
      }
    });
  },
  
  getChatConfig: (chatId: string) => {
    const { chats } = get();
    const chat = chats.find(c => c.id === chatId);
    return chat?.config || get().defaultChatConfig;
  },
  
  updateChatConfig: (chatId: string, update: ChatConfigUpdate) => {
    const { chats } = get();
    const updatedChats = [...chats];
    
    const chatIndex = chats.findIndex(chat => chat.id === chatId);
    if (chatIndex === -1) return;
    
    const currentConfig = chats[chatIndex].config;
    const newConfig = {
      ...currentConfig,
      ...update,
      modelConfig: {
        ...currentConfig.modelConfig,
        ...(update.modelConfig || {}),
        capabilities: {
          ...(currentConfig.modelConfig.capabilities || {}),
          ...(update.modelConfig?.capabilities || {})
        }
      }
    };
    
    updatedChats[chatIndex] = {
      ...updatedChats[chatIndex],
      config: newConfig
    };
    
    set({ chats: updatedChats });
  },
  
  resetChatConfig: (chatId: string) => {
    const { chats, defaultChatConfig } = get();
    const updatedChats = [...chats];
    
    const chatIndex = chats.findIndex(chat => chat.id === chatId);
    if (chatIndex === -1) return;
    
    updatedChats[chatIndex] = {
      ...updatedChats[chatIndex],
      config: { ...defaultChatConfig }
    };
    
    set({ chats: updatedChats });
  },
  
  isCapabilityEnabled: (chatId: string, capabilityId: string) => {
    const config = get().getChatConfig(chatId);
    return !!config.modelConfig.capabilities?.[capabilityId]?.enabled;
  },
  
  updateCapabilityConfig: (chatId: string, capabilityId: string, config: any) => {
    const chatConfig = get().getChatConfig(chatId);
    
    // Create capability update
    const capabilityUpdate = {
      modelConfig: {
        capabilities: {
          [capabilityId]: {
            ...(chatConfig.modelConfig.capabilities?.[capabilityId] || {}),
            ...config
          }
        }
      }
    };
    
    // Update chat config with capability changes
    get().updateChatConfig(chatId, capabilityUpdate);
  }
});

// Alternative implementation using Immer for immutable updates
export const createConfigSliceWithImmer: StateCreator<
  ConfigSlice & { chats: ChatInterface[] },
  [],
  [],
  ConfigSlice
> = (set, get) => ({
  defaultChatConfig: DEFAULT_CHAT_CONFIG,
  
  setDefaultChatConfig: (config: ChatConfig) => 
    set({ defaultChatConfig: config }),
    
  updateDefaultChatConfig: (update: ChatConfigUpdate) => {
    set(
      produce((state) => {
        if (update.provider) {
          state.defaultChatConfig.provider = update.provider;
        }
        
        if (update.modelConfig) {
          Object.assign(state.defaultChatConfig.modelConfig, update.modelConfig);
          
          // Handle capabilities separately for deep merge
          if (update.modelConfig.capabilities) {
            state.defaultChatConfig.modelConfig.capabilities = {
              ...(state.defaultChatConfig.modelConfig.capabilities || {}),
              ...update.modelConfig.capabilities
            };
          }
        }
      })
    );
  },
  
  getChatConfig: (chatId: string) => {
    const { chats } = get();
    const chat = chats.find(c => c.id === chatId);
    return chat?.config || get().defaultChatConfig;
  },
  
  updateChatConfig: (chatId: string, update: ChatConfigUpdate) => {
    set(
      produce((state) => {
        const chatIndex = state.chats.findIndex(chat => chat.id === chatId);
        if (chatIndex === -1) return;
        
        const chat = state.chats[chatIndex];
        
        if (update.provider) {
          chat.config.provider = update.provider;
        }
        
        if (update.modelConfig) {
          Object.assign(chat.config.modelConfig, update.modelConfig);
          
          // Handle capabilities separately for deep merge
          if (update.modelConfig.capabilities) {
            chat.config.modelConfig.capabilities = {
              ...(chat.config.modelConfig.capabilities || {}),
              ...update.modelConfig.capabilities
            };
          }
        }
      })
    );
  },
  
  resetChatConfig: (chatId: string) => {
    set(
      produce((state) => {
        const chatIndex = state.chats.findIndex(chat => chat.id === chatId);
        if (chatIndex === -1) return;
        
        state.chats[chatIndex].config = { ...state.defaultChatConfig };
      })
    );
  },
  
  isCapabilityEnabled: (chatId: string, capabilityId: string) => {
    const config = get().getChatConfig(chatId);
    return !!config.modelConfig.capabilities?.[capabilityId]?.enabled;
  },
  
  updateCapabilityConfig: (chatId: string, capabilityId: string, config: any) => {
    set(
      produce((state) => {
        const chatIndex = state.chats.findIndex(chat => chat.id === chatId);
        if (chatIndex === -1) return;
        
        const chat = state.chats[chatIndex];
        
        // Ensure capabilities object exists
        if (!chat.config.modelConfig.capabilities) {
          chat.config.modelConfig.capabilities = {};
        }
        
        // Ensure capability object exists
        if (!chat.config.modelConfig.capabilities[capabilityId]) {
          chat.config.modelConfig.capabilities[capabilityId] = {};
        }
        
        // Update capability config
        Object.assign(
          chat.config.modelConfig.capabilities[capabilityId],
          config
        );
      })
    );
  }
});

// Export the standard implementation by default
// You can switch to the Immer implementation if preferred
export default createConfigSlice;