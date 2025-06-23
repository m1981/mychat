import { useRef, useEffect } from 'react';
import { ChatStreamHandler } from '@src/handlers/ChatStreamHandler';
import { ChatSubmissionService } from '@services/SubmissionService';
import { ProviderRegistry } from '@config/providers/provider.registry';

// Define the dependencies interface
interface UseStreamHandlerDependencies {
  submissionService?: ChatSubmissionService;
  decoder?: TextDecoder;
}

// Define the return type
type UseStreamHandlerReturn = ChatStreamHandler;

// Update to use getProvider
export function useStreamHandler(
  providerKey: string,
  dependencies: UseStreamHandlerDependencies = {}
): UseStreamHandlerReturn {
  const provider = ProviderRegistry.getProvider(providerKey);
  const { submissionService, decoder = new TextDecoder() } = dependencies;
  
  // Create stream handler ref with explicit service dependency
  const streamHandlerRef = useRef<ChatStreamHandler>(
    new ChatStreamHandler(
      decoder, 
      provider
    )
  );
  
  // Update when provider or service changes
  useEffect(() => {
    console.log('🔄 Setting up stream handler with provider:', providerKey);
    streamHandlerRef.current = new ChatStreamHandler(
      decoder, 
      provider
    );
    
    return () => {
      console.log('🧹 Cleaning up stream handler resources');
    };
  }, [provider, providerKey, decoder]);
  
  return streamHandlerRef.current;
}