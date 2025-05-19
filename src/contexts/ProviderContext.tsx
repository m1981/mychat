   import React, { createContext, useContext, useState, useEffect } from 'react';
   import { AIProviderInterface } from '@type/provider';
   import { ProviderKey } from '@type/chat';
   import { ProviderRegistry } from '@config/providers/provider.registry';
   import useStore from '@store/store';
   import { DEFAULT_PROVIDER } from '@config/chat/ChatConfig';

   // Create context with null as default value
   export const ProviderContext = createContext<AIProviderInterface | null>(null);

   // Provider component that wraps your app and makes the provider available
   export const ProviderProvider: React.FC<{ 
     children: React.ReactNode;
     providerKey?: ProviderKey;
   }> = ({ children, providerKey }) => {
     const { currentChatIndex, chats, apiKeys } = useStore();
     const [provider, setProvider] = useState<AIProviderInterface | null>(null);

     useEffect(() => {
       // Get provider key from prop, current chat, or use default
       const effectiveProviderKey: ProviderKey = providerKey || 
         chats?.[currentChatIndex]?.config?.provider || 
         DEFAULT_PROVIDER;
       
       // Get provider from registry
       const currentProvider = ProviderRegistry.getProvider(effectiveProviderKey);
       
       // Set provider
       setProvider(currentProvider);
     }, [currentChatIndex, chats, providerKey]);

     return (
       <ProviderContext.Provider value={provider}>
         {children}
       </ProviderContext.Provider>
     );
   };

   // Hook to use the provider context
   export const useProvider = (): AIProviderInterface => {
     const context = useContext(ProviderContext);
     if (context === null) {
       throw new Error('useProvider must be used within a ProviderProvider');
     }
     return context;
   }