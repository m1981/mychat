   import { AIProviderInterface } from '@type/provider';
   import { ProviderKey } from '@type/chat';
   import { ProviderRegistry } from '@config/providers/provider.registry';
   
   export class ProviderFactory {
     static getProvider(providerKey: ProviderKey): AIProviderInterface {
       // Use ProviderRegistry instead of directly accessing providers
       return ProviderRegistry.getProviderImplementation(providerKey);
     }
   }