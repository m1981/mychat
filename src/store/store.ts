import { StoreApi, create } from 'zustand';
import { persist, PersistStorage } from 'zustand/middleware';
import { ChatSlice, createChatSlice } from './chat-slice';
import { InputSlice, createInputSlice } from './input-slice';
import { AuthSlice, createAuthSlice } from './auth-slice';
import { ConfigSlice, createConfigSlice } from './config-slice';
import { PromptSlice, createPromptSlice } from './prompt-slice';

export type StoreState = ChatSlice &
  InputSlice &
  AuthSlice &
  ConfigSlice &
  PromptSlice;

export type StoreSlice<T> = (
  set: StoreApi<StoreState>['setState'],
  get: StoreApi<StoreState>['getState']
) => T;

// Custom storage with error handling
const createCustomStorage = (): PersistStorage<Partial<StoreState>> => ({
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
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        useStore.getState().setError(
          'Storage limit reached. Please delete some chats to continue saving new messages.'
        );
      } else {
        useStore.getState().setError(
          'Failed to save to localStorage. ' + error.message
        );
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
  },
});

const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      ...createChatSlice(set, get),
      ...createInputSlice(set, get),
      ...createAuthSlice(set, get),
      ...createConfigSlice(set, get),
      ...createPromptSlice(set, get),
    }),
    {
      name: 'free-chat-gpt',
      version: 1,
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
    })
  );

export default useStore;
