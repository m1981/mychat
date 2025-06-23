   import React, { createContext, useContext, useState, useEffect } from 'react';
   import { AIProviderBase } from '@type/provider';
   import { ProviderKey } from '@type/chat';
   import { ProviderRegistry } from '@config/providers/provider.registry';
   import useStore from '@store/store';
   import { DEFAULT_PROVIDER } from '@config/chat/ChatConfig';

   // Create context with null as default value
   export const ProviderContext = createContext<AIProviderBase | null>(null);

   // Provider component that wraps your app and makes the provider available
   export const ProviderProvider: React.FC<{
     children: React.ReactNode;
     providerKey?: ProviderKey;
   }> = ({ children, providerKey }) => {
     const { currentChatIndex, chats, apiKeys } = useStore();

     // For testing purposes, directly get the provider if providerKey is provided
     if (providerKey) {
       // Use the method that exists in the registry
       const directProvider = ProviderRegistry.getProvider(providerKey);
       return (
         <ProviderContext.Provider value={directProvider}>
           {children}
         </ProviderContext.Provider>
       );
     }

     // For normal app usage, use state and effect
     const [provider, setProvider] = useState<AIProviderBase | null>(() => {
       const effectiveProviderKey = chats?.[currentChatIndex]?.config?.provider || DEFAULT_PROVIDER;
       return ProviderRegistry.getProvider(effectiveProviderKey);
     });

     useEffect(() => {
       const effectiveProviderKey = chats?.[currentChatIndex]?.config?.provider || DEFAULT_PROVIDER;
       const currentProvider = ProviderRegistry.getProvider(effectiveProviderKey);
       setProvider(currentProvider);
     }, [currentChatIndex, chats]);

     return (
       <ProviderContext.Provider value={provider}>
         {children}
       </ProviderContext.Provider>
     );
   };

   // Hook to use the provider context
   export const useProvider = (): AIProviderBase => {
     const context = useContext(ProviderContext);
     if (context === null) {
       throw new Error('useProvider must be used within a ProviderProvider');
     }
     return context;
   }