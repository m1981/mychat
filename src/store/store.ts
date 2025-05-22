import { ProviderRegistry } from '@config/providers/provider.registry';
import { DEFAULT_CHAT_CONFIG } from '@constants/chat';
import { StoreApi, create } from 'zustand';
import { persist, PersistStorage } from 'zustand/middleware';


import { AuthSlice, createAuthSlice } from './auth-slice';
import { ChatSlice, createChatSlice } from './chat-slice';
import { ConfigSlice, createConfigSlice } from './slices/configSlice';
import { InputSlice, createInputSlice } from './input-slice';
import { PromptSlice, createPromptSlice } from './prompt-slice';
import { RequestSlice, createRequestSlice } from './request-slice';

export type StoreState = ChatSlice &
  InputSlice &
  AuthSlice &
  ConfigSlice &
  PromptSlice &
  RequestSlice;

export type StoreSlice<T> = (
  set: StoreApi<StoreState>['setState'],
  get: StoreApi<StoreState>['getState']
) => T;

// Custom storage with error handling
const createCustomStorage = (): PersistStorage<Partial<StoreState>> => {
  let isHandlingError = false;  // Add error handling flag
  
  return {
    getItem: (name) => {
      try {
        const item = localStorage.getItem(name);
        return item ? JSON.parse(item) : null;
      } catch (err: unknown) {
        const error = err as Error;
        console.warn('Error reading from localStorage:', error);
        return null;
      }
    },
    setItem: (name, value) => {
      try {
        localStorage.setItem(name, JSON.stringify(value));
      } catch (err: unknown) {
        const error = err as Error;
        console.warn('Error writing to localStorage:', error);
        
        // Handle storage quota exceeded
        if (!isHandlingError && error.name === 'QuotaExceededError') {
          isHandlingError = true;
          
          // Clear non-essential data
          try {
            // Keep only essential data
            const essentialData = {
              chats: value.chats?.slice(-10) || [], // Keep only last 10 chats
              defaultChatConfig: value.defaultChatConfig,
              apiKeys: value.apiKeys,
              apiEndpoints: value.apiEndpoints
            };
            
            localStorage.setItem(name, JSON.stringify(essentialData));
            console.log('Cleared non-essential data to free up storage');
          } catch (clearError) {
            console.error('Failed to clear data:', clearError);
          }
          
          isHandlingError = false;
        }
      }
    },
    removeItem: (name) => {
      try {
        localStorage.removeItem(name);
      } catch (err: unknown) {
        const error = err as Error;
        console.warn('Error removing from localStorage:', error);
      }
    }
  };
};

// Create store with all slices
const useStore = create<StoreState>()(
  persist(
    (set, get, api) => ({
      ...createChatSlice(set, get, api),
      ...createInputSlice(set, get, api),
      ...createAuthSlice(set, get, api),
      ...createConfigSlice(set, get, api),
      ...createPromptSlice(set, get, api),
      ...createRequestSlice(set, get, api),
    }),
    {
      name: 'chat-store',
      storage: createCustomStorage(),
      partialize: (state) => ({
        // Only persist necessary state
        chats: state.chats,
        defaultChatConfig: state.defaultChatConfig,
        apiKeys: state.apiKeys,
        apiEndpoints: state.apiEndpoints,
        firstVisit: state.firstVisit,
        theme: state.theme,
        prompts: state.prompts,
        autoTitle: state.autoTitle,
        hideMenuOptions: state.hideMenuOptions,
        hideSideMenu: state.hideSideMenu,
        enterToSubmit: state.enterToSubmit,
        layoutWidth: state.layoutWidth
      }),
    }
  )
);

export default useStore;

// Direct selectors for common operations
export const useCurrentChat = () => useStore(state => {
  const { chats, currentChatIndex } = state;
  return chats[currentChatIndex];
});

export const useCurrentChatConfig = () => useStore(state => {
  const { chats, currentChatIndex } = state;
  return chats[currentChatIndex]?.config;
});

export const useCurrentChatId = () => useStore(state => {
  const { chats, currentChatIndex } = state;
  return chats[currentChatIndex]?.id;
});

export const useIsGenerating = () => useStore(state => state.generating);

export const useTheme = () => useStore(state => state.theme);
