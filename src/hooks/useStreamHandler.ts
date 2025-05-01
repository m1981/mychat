import { useRef, useEffect } from 'react';
import { ChatStreamHandler } from '@src/handlers/ChatStreamHandler';
import { providers } from '@type/providers';

export function useStreamHandler(providerKey: string) {
  const provider = providers[providerKey];
  
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