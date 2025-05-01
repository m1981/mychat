import { StoreApi, create } from 'zustand';
import { persist, PersistStorage } from 'zustand/middleware';

import { ProviderRegistry } from '@config/providers/provider.registry';
import { DEFAULT_CHAT_CONFIG } from '@constants/chat';

import { AuthSlice, createAuthSlice } from './auth-slice';
import { ChatSlice, createChatSlice } from './chat-slice';
import { ConfigSlice, createConfigSlice } from './config-slice';
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
      if (isHandlingError) return;  // Prevent recursive error handling
      
      try {
        localStorage.setItem(name, JSON.stringify(value));
      } catch (err: unknown) {
        isHandlingError = true;
        const error = err as Error;
        if (error instanceof Error && error.name === 'QuotaExceededError') {
          useStore.getState().setError(
            'Storage limit reached. Please delete some chats to continue saving new messages.'
          );
        } else {
          useStore.getState().setError(
            'Failed to save to localStorage. ' + error.message
          );
        }
        isHandlingError = false;
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

const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      ...createChatSlice(set, get),
      ...createInputSlice(set, get),
      ...createAuthSlice(set, get),
      ...createConfigSlice(set, get),
      ...createPromptSlice(set, get),
      ...createRequestSlice(set, get),
    }),
    {
      name: 'free-chat-gpt',
      version: 2, // Increment version for new provider implementation
      storage: createCustomStorage(),
      partialize: (state) => ({
        chats: state.chats,
        currentChatIndex: state.currentChatIndex,
        apiKeys: state.apiKeys,
        apiEndpoints: state.apiEndpoints,
        theme: state.theme,
        autoTitle: state.autoTitle,
        prompts: state.prompts,
        defaultChatConfig: state.defaultChatConfig,
        defaultSystemMessage: state.defaultSystemMessage,
        hideMenuOptions: state.hideMenuOptions,
        firstVisit: state.firstVisit,
        hideSideMenu: state.hideSideMenu,
        folders: state.folders,
        enterToSubmit: state.enterToSubmit,
        layoutWidth: state.layoutWidth,
      }),
      onRehydrateStorage: () => (state) => {
        // Optional: Log when storage is rehydrated
        console.log('Storage rehydrated');
      },
      migrate: (persistedState: any, version: number) => {
        if (version === 1) {
          // Migrate old provider configuration to new format
          const chats = persistedState.chats?.map((chat: any) => ({
            ...chat,
            config: {
              provider: chat.config?.provider || 'anthropic',
              modelConfig: {
                ...chat.config?.modelConfig,
                model: ProviderRegistry.getProvider('anthropic').defaultModel,
              },
            },
          }));

          return {
            ...persistedState,
            chats,
            defaultChatConfig: DEFAULT_CHAT_CONFIG,
          };
        }
        return persistedState;
      },
    })
  );

export default useStore;
