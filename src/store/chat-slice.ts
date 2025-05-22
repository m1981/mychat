import { StateCreator } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { ChatSlice, StoreState } from './types';
import { debug } from '@utils/debug';

export const createChatSlice: StateCreator<StoreState, [], [], ChatSlice> = (set, get) => ({
  chats: [],
  currentChatIndex: -1,
  
  createChat: () => {
    debug.log('store', 'Creating new chat');
    
    // Get the default config from the store
    const defaultConfig = get().defaultChatConfig;
    debug.log('store', 'Default config for new chat:', defaultConfig);
    
    // Create a deep copy of the default config to avoid reference issues
    const configCopy = JSON.parse(JSON.stringify(defaultConfig));
    
    // Ensure capabilities is an object, not an array
    if (configCopy.modelConfig && Array.isArray(configCopy.modelConfig.capabilities)) {
      debug.warn('store', 'Default config capabilities is an array, converting to object');
      configCopy.modelConfig.capabilities = {};
    }
    
    // Create the new chat with the copied config
    const newChat = {
      id: uuidv4(),
      title: 'New Chat',
      messages: [],
      config: configCopy,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      folder: null
    };
    
    debug.log('store', 'New chat created:', newChat);
    
    set(state => ({
      chats: [...state.chats, newChat],
      currentChatIndex: state.chats.length
    }));
    
    return newChat.id;
  },
  
  // Rest of the slice implementation...
});