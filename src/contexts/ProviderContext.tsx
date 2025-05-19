   import React, { createContext, useContext, ReactNode } from 'react';
   import { AIProviderInterface } from '@type/provider';
   import { ProviderKey } from '@type/chat';
   import { providers } from '@type/providers';

   export type ProviderContextType = AIProviderInterface | null;

   const ProviderContext = createContext<ProviderContextType>(null);

   interface ProviderProviderProps {
     providerKey: ProviderKey;
     children: ReactNode;
   }

   export function ProviderProvider({ providerKey, children }: ProviderProviderProps) {
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