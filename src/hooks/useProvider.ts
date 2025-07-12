import { useState, useEffect } from 'react';

import { DEFAULT_PROVIDER } from '@config/chat/ChatConfig';
import { ProviderRegistry } from '@config/providers/provider.registry';
import { ProviderKey, AIProviderBase } from '@type/provider';

export function useProvider(providerKey?: ProviderKey) {
  const [provider, setProvider] = useState<AIProviderBase>(
    ProviderRegistry.getProvider(providerKey || DEFAULT_PROVIDER)
  );
  
  useEffect(() => {
    setProvider(ProviderRegistry.getProvider(providerKey || DEFAULT_PROVIDER));
  }, [providerKey]);
  
  return provider;
}