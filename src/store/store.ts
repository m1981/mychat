import { ProviderRegistry } from '@config/providers/provider.registry';
import { createDefaultChatConfig, DEFAULT_SYSTEM_MESSAGE } from '@constants/chat';
import { StoreApi, create } from 'zustand';
import { persist, PersistStorage } from 'zustand/middleware';
import * as Sentry from '@sentry/react';

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
  RequestSlice & {
    resetState: () => void;
  };

export type StoreSlice<T> = (
  set: StoreApi<StoreState>['setState'],
  get: StoreApi<StoreState>['getState']
) => T;

// Custom storage with improved error handling
const createCustomStorage = (): PersistStorage<Partial<StoreState>> => {
  let isHandlingError = false;
  
  return {
    getItem: (name) => {
      try {
        const item = localStorage.getItem(name);
        return item ? JSON.parse(item) : null;
      } catch (err: unknown) {
        const error = err as Error;
        Sentry.withScope((scope) => {
          scope.setTag('operation', 'store-getItem');
          scope.setExtra('storageKey', name);
          Sentry.captureException(error);
        });
        console.warn('Error reading from localStorage:', error);
        return null;
      }
    },
    setItem: (name, value) => {
      if (isHandlingError) return;
      
      try {
        localStorage.setItem(name, JSON.stringify(value));
      } catch (err: unknown) {
        isHandlingError = true;
        const error = err as Error;
        
        Sentry.withScope((scope) => {
          scope.setTag('operation', 'store-setItem');
          scope.setExtra('storageKey', name);
          scope.setExtra('valueSize', JSON.stringify(value).length);
          Sentry.captureException(error);
        });
        
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
        Sentry.withScope((scope) => {
          scope.setTag('operation', 'store-removeItem');
          scope.setExtra('storageKey', name);
          Sentry.captureException(error);
        });
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
      
      // Add resetState function to reset the store to initial values
      resetState: () => {
        console.log('Resetting store state to defaults');
        set({
          chats: [],
          currentChatIndex: -1,
          defaultChatConfig: createDefaultChatConfig(),
          // Reset other state properties as needed
          apiKeys: {},
          apiEndpoints: {},
          theme: 'system',
          autoTitle: true,
          prompts: [],
          defaultSystemMessage: DEFAULT_SYSTEM_MESSAGE,
          hideMenuOptions: false,
          firstVisit: true,
          hideSideMenu: false,
          folders: [],
          enterToSubmit: true,
          layoutWidth: 'normal',
        });
      }
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
      onRehydrateStorage: () => () => {
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
