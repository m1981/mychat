import { useRef, useEffect } from 'react';

import { ChatStreamHandler } from '@src/handlers/ChatStreamHandler';
import { ProviderKey, AIProvider } from '../types';
import { providers } from '../types/providers';

// Add type guard for provider key
const isProviderKey = (key: string): key is ProviderKey => 
  key === 'openai' || key === 'anthropic';

// Use type guard before accessing providers
const getProvider = (key: string): AIProvider => {
  if (isProviderKey(key)) {
    return providers[key];
  }
  // Default to anthropic if invalid
  return providers['anthropic'];
};

export function useStreamHandler(providerKey: string) {
  const provider = getProvider(providerKey);
  
  // Create stream handler ref
  const streamHandlerRef = useRef<ChatStreamHandler>(
    new ChatStreamHandler(new TextDecoder(), provider)
  );
  
  // Update stream handler when provider changes
  useEffect(() => {
    console.log('🔄 Setting up stream handler with provider:', providerKey);
    streamHandlerRef.current = new ChatStreamHandler(new TextDecoder(), provider);
    
    return () => {
      console.log('🧹 Cleaning up stream handler resources');
    };
  }, [provider, providerKey]);
  
  return streamHandlerRef.current;
}