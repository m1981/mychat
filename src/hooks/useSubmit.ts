
import { useRef, useCallback, useMemo } from 'react';
import { DEFAULT_PROVIDER } from '@config/chat/ChatConfig';
import { DEFAULT_MODEL_CONFIG } from '@config/chat/ModelConfig';
import { StorageService, StorageQuotaError } from '@src/services/StorageService';
import { SubmissionLock } from '@src/services/SubmissionLock';
import { ChatSubmissionService } from '@src/services/SubmissionService';
import useStore from '@store/store';
import { ModelConfig } from '@type/chat';
import { providers } from '@type/providers';
import { debug } from '@utils/debug';
import { useProvider } from '@contexts/ProviderContext';

import { useMessageManager } from './useMessageManager';
import { useStreamHandler } from './useStreamHandler';
import { useSubmissionState } from './useSubmissionState';
import { useTitleGeneration } from './useTitleGeneration';

// Constants at the top
const STORAGE_CONFIG = {
  maxStorageSize: 10 * 1024 * 1024, // 10MB
  warningThreshold: 0.85 // 85%
} as const;

// Add a global submission manager outside of the hook
export const globalSubmissionManager = {
  isSubmitting: false,
  
  startSubmission() {
    debug.log('useSubmit', '[useSubmit] Global submission started');
    this.isSubmitting = true;
    return true;
  },
  
  endSubmission() {
    debug.log('useSubmit', '[useSubmit] Global submission ended');
    this.isSubmitting = false;
  },
  
  abort(reason: string) {
    debug.log('useSubmit', `[useSubmit] Global submission aborted: ${reason}`);
    this.isSubmitting = false;
  }
};

// Extract pure functions to the module scope
const createErrorMessage = (error: unknown): string => {
  if (error instanceof StorageQuotaError) {
    return 'Not enough storage space. Please clear some chats.';
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unknown error occurred';
};

// Define interfaces for dependencies
interface SubmitDependencies {
  store?: typeof useStore;
  submissionLock?: SubmissionLock;
  storageService?: StorageService;
  messageManager?: ReturnType<typeof useMessageManager>;
  streamHandler?: ReturnType<typeof useStreamHandler>;
  titleGeneration?: ReturnType<typeof useTitleGeneration>;
  submissionState?: ReturnType<typeof useSubmissionState>;
}

// The hook implementation with dependency injection
function useSubmit(dependencies: SubmitDependencies = {}) {

  // Use injected dependencies or create defaults
  const store = dependencies.store || useStore;
  
  // Store access - including request state
  const {
    currentChatIndex,
    chats,
    apiKeys,
    error,
    setError,
    setGenerating,
    generating,
    
    // Request state from Zustand
    isRequesting,
    startRequest,
    stopRequest,
    resetRequestState
  } = store();

  // Create a render counter outside useMemo
  const renderCountRef = useRef(0);

  // Provider setup with memoization and caller tracking
  const providerSetup = useMemo(() => {
    renderCountRef.current += 1;
    
    const currentChat = chats?.[currentChatIndex];
    const providerKey = currentChat?.config.provider || DEFAULT_PROVIDER;
    const key = apiKeys[providerKey];
    
    return {
      currentChat,
      providerKey,
      provider: providers[providerKey],
      apiKey: key,
      renderCount: renderCountRef.current
    };
  }, [chats, currentChatIndex, apiKeys]);

  // Create refs for services that need to persist
  const submissionLockRef = useRef(dependencies.submissionLock || new SubmissionLock());
  const storageServiceRef = useRef(dependencies.storageService || new StorageService(STORAGE_CONFIG));
  
  // Use composable hooks or injected dependencies
  const streamHandler = dependencies.streamHandler || useStreamHandler(providerSetup.providerKey);
  const messageManager = dependencies.messageManager || useMessageManager();
  const titleGeneration = dependencies.titleGeneration || useTitleGeneration(providerSetup.providerKey);
  const submission = dependencies.submissionState || useSubmissionState();

  const stopGeneration = useCallback(() => {
    debug.log('useSubmit', '[useSubmit] Stopping generation');
    submission?.dispatch?.({ type: 'ABORT' });
    stopRequest('User stopped generation');
    globalSubmissionManager.abort('User stopped generation');
    setGenerating(false);
  }, [stopRequest, setGenerating, submission]);

  // Extract submission preparation
  const prepareSubmission = useCallback(async () => {
    submission?.dispatch?.({ type: 'PREPARING' });
    await storageServiceRef.current.checkQuota();
    setGenerating(true);
    setError(null);
  }, [submission, setGenerating, setError]);

  // Extract message handling
  const prepareMessages = useCallback(() => {
    const currentState = messageManager.getStoreState();
    const updatedChats = messageManager.appendAssistantMessage(
      currentState.chats,
      currentState.currentChatIndex
    );
    messageManager.setChats(updatedChats);

    return {
      currentState,
      updatedChats
    };
  }, [messageManager]);

  const handleSubmit = useCallback(async () => {
    debug.log('useSubmit', '[useSubmit] handleSubmit called');
    
    // Use global submission manager
    if (globalSubmissionManager.isSubmitting) {
      debug.log('useSubmit', '[useSubmit] Global submission already in progress');
      return;
    }
    
    // Check if API key exists
    if (!providerSetup.apiKey) {
      debug.error('useSubmit', '[useSubmit] No API key found for provider:', providerSetup.providerKey);
      
      // For production, show the error
      setError(`No API key found for ${providerSetup.providerKey}. Please add your API key in settings.`);
      return;
    }
    
    // Start global submission
    globalSubmissionManager.startSubmission();
    
    try {
      if (!submissionLockRef.current.lock()) {
        debug.log('useSubmit', '[useSubmit] Submission canceled - already in progress');
        globalSubmissionManager.endSubmission();
        return;
      }
      
      // Start tracking with state machine
      submission?.dispatch?.({ type: 'SUBMIT_START' });
      
      // Start request in Zustand - this creates the abort controller
      debug.log('useSubmit', '[useSubmit] Starting request via Zustand');
      startRequest();
      
      // Use extracted functions
      await prepareSubmission();
      const { updatedChats, currentState } = prepareMessages();
      
      // Prepare submission
      submission?.dispatch?.({ type: 'SUBMITTING' });
      const currentChat = updatedChats[currentState.currentChatIndex];
      const currentMessages = currentChat.messages;
      
      // Get model configuration
      const modelConfig = {
        ...DEFAULT_MODEL_CONFIG,
        ...currentChat.config.modelConfig
      };
      
      // Create submission service
      debug.log('useSubmit', '[useSubmit] Creating submission service');
      const submissionService = new ChatSubmissionService(
        providerSetup.provider,
        providerSetup.apiKey,
        (content) => {
          // Track streaming state
          submission?.dispatch?.({ type: 'CONTENT_RECEIVED' });
          
          // Update content
          const latestState = messageManager.getStoreState();
          const updatedChats = messageManager.updateMessageContent(
            latestState.chats,
            latestState.currentChatIndex,
            content
          );
          messageManager.setChats(updatedChats);
        },
        streamHandler
      );
      
      // Submit request
      debug.log('useSubmit', '[useSubmit] Submitting request');
      submission?.dispatch?.({ type: 'STREAMING' });
      await submissionService.submit(currentMessages, {
        ...modelConfig,
        stream: true
      } as ModelConfig);
      
      // Stream complete
      debug.log('useSubmit', '[useSubmit] Stream complete');
      submission?.dispatch?.({ type: 'STREAM_COMPLETE' });
      
      // Generate title
      debug.log('useSubmit', '[useSubmit] Generating title');
      submission?.dispatch?.({ type: 'GENERATING_TITLE' });

      // Get the latest state to ensure we have the most up-to-date messages
      const latestState = messageManager.getStoreState();
      const latestChat = latestState.chats[latestState.currentChatIndex];
      const latestMessages = latestChat.messages;

      await titleGeneration.generateTitle(latestMessages, modelConfig);
      
      // Complete successfully
      debug.log('useSubmit', '[useSubmit] Submission complete');
      submission?.dispatch?.({ type: 'COMPLETE' });
      
    } catch (error: unknown) {
      // Track error state
      submission?.dispatch?.({ type: 'ERROR', payload: error as Error });
      
      // Error handling
      if (error instanceof Error && error.name === 'AbortError') {
        debug.log('useSubmit', '[useSubmit] Request was aborted:', error.message);
      } else {
        debug.error('useSubmit', '[useSubmit] Submit error:', error);
        setError(createErrorMessage(error));
      }
    } finally {
      // Clean up
      debug.log('useSubmit', '[useSubmit] Cleaning up after submission');
      setGenerating(false);
      
      if (isRequesting) {
        debug.log('useSubmit', '[useSubmit] Resetting request state in Zustand');
        resetRequestState();
      }
      
      submissionLockRef.current.unlock();
      globalSubmissionManager.endSubmission();
    }
  }, [
    setGenerating, 
    setError, 
    startRequest, 
    resetRequestState, 
    isRequesting,
    submission,
    messageManager,
    streamHandler,
    titleGeneration,
    createErrorMessage,
    providerSetup  // Use the entire memoized object instead of individual properties
  ]);

  const regenerateMessage = useCallback(async () => {
    if (generating || !chats) {
      return;
    }

    const updatedChats = JSON.parse(JSON.stringify(chats));
    const currentMessages = updatedChats[currentChatIndex].messages;
    if (currentMessages[currentMessages.length - 1]?.role === 'assistant') {
      currentMessages.pop();
    }

    messageManager.setChats(updatedChats);
    await handleSubmit();
  }, [generating, chats, currentChatIndex, messageManager, handleSubmit]);

  return { handleSubmit, stopGeneration, regenerateMessage, error, generating };
}

export { useSubmit };

// For testing purposes only
export const __TEST_ONLY__ = {
  createErrorMessage,
  prepareSubmission: (
    submission: { dispatch: Function },
    storageService: { checkQuota: Function },
    setGenerating: Function,
    setError: Function
  ) => {
    return async () => {
      submission?.dispatch?.({ type: 'PREPARING' });
      await storageService.checkQuota();
      setGenerating(true);
      setError(null);
    };
  },
  prepareMessages: (messageManager: any) => {
    return () => {
      const currentState = messageManager.getStoreState();
      const updatedChats = messageManager.appendAssistantMessage(
        currentState.chats,
        currentState.currentChatIndex
      );
      messageManager.setChats(updatedChats);
      return {
        currentState,
        updatedChats
      };
    };
  }
};