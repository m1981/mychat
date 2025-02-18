import { StoreApi, create } from 'zustand';
import { persist } from 'zustand/middleware';
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
      version: 1, // Reset to version 1
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
    }
  )
);

export default useStore;
