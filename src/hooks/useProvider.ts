import { useState, useEffect } from 'react';
import { ProviderRegistry } from '@config/providers/provider.registry';
import { ProviderKey, AIProviderBase } from '@type/provider';
import { DEFAULT_PROVIDER } from '@config/chat/ChatConfig';

export function useProvider(providerKey?: ProviderKey) {
  const [provider, setProvider] = useState<AIProviderBase>(
    ProviderRegistry.getProviderImplementation(providerKey || DEFAULT_PROVIDER)
  );
  
  useEffect(() => {
    setProvider(ProviderRegistry.getProviderImplementation(providerKey || DEFAULT_PROVIDER));
  }, [providerKey]);
  
  return provider;
}