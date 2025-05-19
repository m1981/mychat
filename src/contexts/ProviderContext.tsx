   import React, { createContext, useContext } from 'react';
   import { AIProviderInterface } from '@type/provider';
   import { ProviderKey } from '@type/chat';
   import { providers } from '@type/providers';
   
   const ProviderContext = createContext<AIProviderInterface | null>(null);
   
   export function ProviderProvider({ providerKey, children }) {
     const provider = providers[providerKey];
     return (
       <ProviderContext.Provider value={provider}>
         {children}
       </ProviderContext.Provider>
     );
   }
   
   export function useProvider(): AIProviderInterface {
     const provider = useContext(ProviderContext);
     if (!provider) {
       throw new Error('useProvider must be used within a ProviderProvider');
     }
     return provider;
   }