
import { StoreSlice } from './store';
import { ChatInterface, FolderCollection, MessageInterface } from '@type/chat';

export interface ChatSlice {
  messages: MessageInterface[];
  chats?: ChatInterface[];
  currentChatIndex: number;
  generating: boolean;
  error: string;
  folders: FolderCollection;
  currentChatTokenCount: number;
  setMessages: (messages: MessageInterface[]) => void;
  setChats: (chats: ChatInterface[]) => void;
  setCurrentChatIndex: (currentChatIndex: number) => void;
  setGenerating: (generating: boolean) => void;
  setError: (error: string) => void;
  setFolders: (folders: FolderCollection) => void;
  setCurrentChatTokenCount: (tokenCount: number) => void;
}

export const createChatSlice: StoreSlice<ChatSlice> = (set, get) => ({
  messages: [],
  currentChatIndex: -1,
  generating: false,
  error: '',
  folders: {},
  currentChatTokenCount: 0,
  setMessages: (messages: MessageInterface[]) => {
    set((prev: ChatSlice) => ({
      ...prev,
      messages: messages,
    }));
  },
  setChats: (chats: ChatInterface[]) => {
    set((prev: ChatSlice) => ({
      ...prev,
      chats: chats,
    }));
  },
  setCurrentChatIndex: (currentChatIndex: number) => {
    set((prev: ChatSlice) => ({
      ...prev,
      currentChatIndex: currentChatIndex,
    }));
  },
  setGenerating: (generating: boolean) => {
    set((prev: ChatSlice) => ({
      ...prev,
      generating: generating,
    }));
  },
  setError: (error: string) => {
    set((prev: ChatSlice) => ({
      ...prev,
      error: error,
    }));
  },
  setFolders: (folders: FolderCollection) => {
    set((prev: ChatSlice) => ({
      ...prev,
      folders: folders,
    }));
  },
  setCurrentChatTokenCount: (tokenCount: number) => {
    set((prev: ChatSlice) => ({
      ...prev,
      currentChatTokenCount: tokenCount,
    }));
  },
});

```


```
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export default app;

```


```
import React from 'react';
import useStore from '@store/store';
import { MessageInterface } from '@type/chat';
import { generateDefaultChat } from '@constants/chat';

const useInitialiseNewChat = () => {
  const setChats = useStore((state) => state.setChats);
  const setCurrentChatIndex = useStore((state) => state.setCurrentChatIndex);

  const initialiseNewChat = () => {
    setChats([generateDefaultChat()]);
    setCurrentChatIndex(0);
  };

  return initialiseNewChat;
};

export default useInitialiseNewChat;

```


```
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import useStore from '@store/store';
import PopupModal from '@components/PopupModal';
import { providers } from '@type/providers';
import { ProviderKey } from '@type/chat';

const ApiMenu = ({
  setIsModalOpen
}: {
  setIsModalOpen: React.Dispatch<React.SetStateAction<boolean>>
}) => {
  const { t } = useTranslation(['main', 'api']);
  const currentProvider = useStore((state) => state.defaultChatConfig.provider);
  const setProvider = useStore((state) => state.setProvider);

  const apiKeys = useStore((state) => state.apiKeys);
  const setApiKey = useStore((state) => state.setApiKey);
  const apiEndpoints = useStore((state) => state.apiEndpoints);
  const setApiEndpoint = useStore((state) => state.setApiEndpoint);

  const [tempApiKeys, setTempApiKeys] = useState<Record<ProviderKey, string>>(apiKeys);
  const [tempEndpoints, setTempEndpoints] = useState<Record<ProviderKey, string>>(apiEndpoints);

  const handleSave = () => {
    // Save API keys and endpoints
    Object.entries(tempApiKeys).forEach(([provider, key]) => {
      setApiKey(provider as ProviderKey, key);
    });

    Object.entries(tempEndpoints).forEach(([provider, endpoint]) => {
      setApiEndpoint(provider as ProviderKey, endpoint);
    });

    setIsModalOpen(false);
  };

  return (
    <PopupModal
      title={t('api') as string}
      setIsModalOpen={setIsModalOpen}
      handleConfirm={handleSave}
    >
      <div className='p-6 border-b border-gray-200 dark:border-gray-600'>
        {/* API Keys and Endpoints for each provider */}
        {Object.values(providers).map((p) => (
          <div key={p.id} className='mb-6'>
            <div className='mb-4'>
              <label className='block text-sm font-medium text-gray-900 dark:text-white'>
                {p.name} API Key
              </label>
              <input
                type='password'
                value={tempApiKeys[p.id] || ''}
                onChange={(e) => setTempApiKeys({
                  ...tempApiKeys,
                  [p.id]: e.target.value
                })}
                className='mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500'
              />
            </div>

            <div className='mb-4'>
              <label className='block text-sm font-medium text-gray-900 dark:text-white'>
                {p.name} Endpoint
              </label>
              <select
                value={tempEndpoints[p.id] || p.endpoints[0]}
                onChange={(e) => setTempEndpoints({
                  ...tempEndpoints,
                  [p.id]: e.target.value
                })}
                className='mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500'
              >
                {p.endpoints.map((endpoint) => (
                  <option key={endpoint} value={endpoint}>
                    {endpoint}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ))}

        {/* Info Messages */}
        <div className='text-sm text-gray-900 dark:text-gray-300 flex flex-col gap-3'>
          <p>{t('securityMessage', { ns: 'api' })}</p>
          <p>{t('apiEndpoint.description', { ns: 'api' })}</p>
          <p>{t('apiEndpoint.warn', { ns: 'api' })}</p>
        </div>
      </div>
    </PopupModal>
  );
};

export default ApiMenu;
```

```
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
      }),
    }
  )
);

export default useStore;

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { shallow } from 'zustand/shallow';
import useStore from '@store/store';
import ConfigMenu from '@components/ConfigMenu';
import { ChatInterface, ChatConfig } from '@type/chat';
import { _defaultChatConfig } from '@constants/chat';
import { providers } from '@type/providers';

const ChatTitle = React.memo(() => {
  const { t } = useTranslation('model');
  const config = useStore(
    (state) =>
      state.chats &&
      state.chats.length > 0 &&
      state.currentChatIndex >= 0 &&
      state.currentChatIndex < state.chats.length
        ? state.chats[state.currentChatIndex].config
        : undefined,
    shallow
  );
  const setChats = useStore((state) => state.setChats);
  const currentChatIndex = useStore((state) => state.currentChatIndex);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const setConfig = (config: ChatConfig) => {
    const updatedChats: ChatInterface[] = JSON.parse(
      JSON.stringify(useStore.getState().chats)
    );
    updatedChats[currentChatIndex].config = config;
    setChats(updatedChats);
  };

  useEffect(() => {
    const chats = useStore.getState().chats;
    if (chats && chats.length > 0 && currentChatIndex !== -1 && !config) {
      const updatedChats: ChatInterface[] = JSON.parse(JSON.stringify(chats));
      updatedChats[currentChatIndex].config = { ..._defaultChatConfig };
      setChats(updatedChats);
    }
  }, [currentChatIndex]);

  return config ? (
    <>
      <div
        className='flex gap-x-4 gap-y-1 flex-wrap w-full items-center justify-center border-b border-black/10 bg-gray-50 p-3 dark:border-gray-900/50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 cursor-pointer'
        onClick={() => setIsModalOpen(true)}
      >
        <div className='text-center p-1 rounded-md bg-gray-300/20 dark:bg-gray-900/10 hover:bg-gray-300/50 dark:hover:bg-gray-900/50'>
          {t('provider')}: {providers[config.provider].name}
        </div>
        <div className='text-center p-1 rounded-md bg-gray-300/20 dark:bg-gray-900/10 hover:bg-gray-300/50 dark:hover:bg-gray-900/50'>
          {t('model')}: {config.modelConfig.model}
        </div>
        <div className='text-center p-1 rounded-md bg-gray-300/20 dark:bg-gray-900/10 hover:bg-gray-300/50 dark:hover:bg-gray-900/50'>
          {t('token.label')}: {config.modelConfig.max_tokens}
        </div>
        <div className='text-center p-1 rounded-md bg-gray-300/20 dark:bg-gray-900/10 hover:bg-gray-300/50 dark:hover:bg-gray-900/50'>
          {t('temperature.label')}: {config.modelConfig.temperature}
        </div>
        <div className='text-center p-1 rounded-md bg-gray-300/20 dark:bg-gray-900/10 hover:bg-gray-300/50 dark:hover:bg-gray-900/50'>
          {t('topP.label')}: {config.modelConfig.top_p}
        </div>
        <div className='text-center p-1 rounded-md bg-gray-300/20 dark:bg-gray-900/10 hover:bg-gray-300/50 dark:hover:bg-gray-900/50'>
          {t('presencePenalty.label')}: {config.modelConfig.presence_penalty}
        </div>
        <div className='text-center p-1 rounded-md bg-gray-300/20 dark:bg-gray-900/10 hover:bg-gray-300/50 dark:hover:bg-gray-900/50'>
          {t('frequencyPenalty.label')}: {config.modelConfig.frequency_penalty}
        </div>
      </div>
      {isModalOpen && (
        <ConfigMenu
          setIsModalOpen={setIsModalOpen}
          config={config}
          setConfig={setConfig}
        />
      )}
    </>
  ) : (
    <></>
  );
});

export default ChatTitle;


