import { useRef, useEffect } from 'react';
import { ChatStreamHandler } from '@src/handlers/ChatStreamHandler';
import { ChatSubmissionService } from '@services/SubmissionService';
import { providers } from '@type/providers';

// Make the dependency on ChatSubmissionService explicit
export function useStreamHandler(
  providerKey: string,
  submissionService?: ChatSubmissionService // Optional parameter
) {
  const provider = providers[providerKey];
  
  // Create stream handler ref with explicit service dependency
  const streamHandlerRef = useRef<ChatStreamHandler>(
    new ChatStreamHandler(
      new TextDecoder(), 
      provider,
      submissionService // Pass the service if provided
    )
  );
  
  // Update when provider or service changes
  useEffect(() => {
    console.log('🔄 Setting up stream handler with provider:', providerKey);
    streamHandlerRef.current = new ChatStreamHandler(
      new TextDecoder(), 
      provider,
      submissionService
    );
    
    return () => {
      console.log('🧹 Cleaning up stream handler resources');
    };
  }, [provider, providerKey, submissionService]);
  
  return streamHandlerRef.current;
}