import React, { createContext, useContext, ReactNode } from 'react';
import { DEFAULT_PROVIDER } from '@config/chat/ChatConfig';
import useStore from '@store/store';
import { providers } from '@type/providers';

interface ProviderConfig {
  providerKey: string;
  provider: (typeof providers)[keyof typeof providers];
  apiKey: string;
}

const ProviderConfigContext = createContext<ProviderConfig | null>(null);

export const useProviderConfig = () => {
  const context = useContext(ProviderConfigContext);
  if (!context) {
    throw new Error('useProviderConfig must be used within a ProviderConfigProvider');
  }
  return context;
};

interface ProviderConfigProviderProps {
  children: ReactNode;
}

export const ProviderConfigProvider: React.FC<ProviderConfigProviderProps> = ({ children }) => {
  const store = useStore();
  const { currentChatIndex, chats, apiKeys } = store;
  
  const providerKey = chats?.[currentChatIndex]?.config.provider || DEFAULT_PROVIDER;
  const provider = providers[providerKey];
  const apiKey = apiKeys[providerKey];
  
  const value = {
    providerKey,
    provider,
    apiKey
  };
  
  return (
    <ProviderConfigContext.Provider value={value}>
      {children}
    </ProviderConfigContext.Provider>
  );
};