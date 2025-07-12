import { useRef, useEffect, useMemo } from 'react';

import { ProviderRegistry } from '@config/providers/provider.registry';
import { ChatStreamHandler } from '@src/handlers/ChatStreamHandler';
import { debug } from '@utils/debug';

// Define the dependencies interface
interface UseStreamHandlerDependencies {
  decoder?: TextDecoder;
}

// Define the return type
type UseStreamHandlerReturn = ChatStreamHandler;

// Update to use getProvider and fix infinite loop
export function useStreamHandler(
  providerKey: string,
  dependencies: UseStreamHandlerDependencies = {}
): UseStreamHandlerReturn {
  const { decoder = new TextDecoder() } = dependencies;
  
  // Use ref to store the provider to avoid re-renders
  const providerRef = useRef(ProviderRegistry.getProvider(providerKey));
  
  // Update provider ref when providerKey changes
  useEffect(() => {
    debug.log('stream', `🔄 Updating provider reference for: ${providerKey}`);
    providerRef.current = ProviderRegistry.getProvider(providerKey);
  }, [providerKey]);
  
  // Use ref to store the handler instance to avoid re-renders
  const handlerRef = useRef<ChatStreamHandler | null>(null);
  
  // Initialize the handler if it doesn't exist
  if (!handlerRef.current) {
    debug.log('stream', `🔄 Creating initial stream handler for provider: ${providerKey}`);
    handlerRef.current = new ChatStreamHandler(decoder, providerRef.current);
  }
  
  // Update handler when dependencies change
  useEffect(() => {
    debug.log('stream', `🔄 Setting up stream handler with provider: ${providerKey}`);
    
    // Only create a new handler if the provider or decoder changed
    const newHandler = new ChatStreamHandler(decoder, providerRef.current);
    handlerRef.current = newHandler;
    
    return () => {
      debug.log('stream', '🧹 Cleaning up stream handler resources');
      // Any cleanup needed for the handler
    };
  }, [providerKey, decoder]);
  
  // Use useMemo to ensure we don't create a new reference on every render
  return useMemo(() => {
    return handlerRef.current as ChatStreamHandler;
  }, [handlerRef.current]);
}