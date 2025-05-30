import { useRef, useEffect } from 'react';
import { ChatStreamHandler } from '@src/handlers/ChatStreamHandler';
import { AIProvider } from '../types';
import { providers } from '../types/providers';
import { getSafeProviderKey } from '../utils/typeGuards';

export function useStreamHandler(providerKey: string) {
  // Use centralized type guard
  const safeKey = getSafeProviderKey(providerKey);
  const provider = providers[safeKey];
  
  // Create stream handler ref
  const streamHandlerRef = useRef<ChatStreamHandler>(
    new ChatStreamHandler(new TextDecoder(), provider)
  );
  
  // Update when provider changes
  useEffect(() => {
    console.log('🔄 Setting up stream handler with provider:', providerKey);
    streamHandlerRef.current = new ChatStreamHandler(new TextDecoder(), provider);
    
    return () => {
      console.log('🧹 Cleaning up stream handler resources');
    };
  }, [provider, providerKey]);
  
  return streamHandlerRef.current;
}