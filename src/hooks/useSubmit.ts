import { useRef, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { DEFAULT_PROVIDER } from '@config/chat/ChatConfig';
import { DEFAULT_MODEL_CONFIG } from '@config/chat/ModelConfig';
import useStore from '@store/store';
import { ChatInterface, MessageInterface, ModelConfig } from '@type/chat';
import { providers } from '@type/providers';
import { RequestConfig } from '@type/provider';
import { getChatCompletion } from '@src/api/api';
import { ChatStreamHandler } from '@src/handlers/ChatStreamHandler';
import { ChatSubmissionService } from '@src/services/SubmissionService';
import { TitleGenerator } from '@src/services/TitleGenerator';
import { StorageService, StorageQuotaError } from '@src/services/StorageService';
import { SubmissionLock } from '@src/services/SubmissionLock';
import { TitleGenerationService } from '@src/services/TitleGenerationService';
import { useSubmissionState } from './useSubmissionState';

// Constants at the top
const STORAGE_CONFIG = {
  maxStorageSize: 10 * 1024 * 1024, // 10MB
  warningThreshold: 0.85 // 85%
} as const;

interface Services {
  submission: SubmissionLock;
  storage: StorageService;
  titleGeneration: TitleGenerationService;
}

// Add a global submission manager outside of the hook
const globalSubmissionManager = {
  isSubmitting: false,
  
  startSubmission() {
    console.log('🌎 Global submission started');
    this.isSubmitting = true;
    // No longer creating an abort controller here
    return true;
  },
  
  endSubmission() {
    console.log('🌎 Global submission ended');
    this.isSubmitting = false;
  },
  
  abort(reason: string) {
    console.log(`🌎 Global submission aborted: ${reason}`);
    this.isSubmitting = false;
    // No longer aborting here - Zustand will handle it
  }
};

const useSubmit = () => {
  const { i18n } = useTranslation();
  const store = useStore();
  
  // Store access - including request state
  const {
    currentChatIndex,
    chats,
    apiKeys,
    error,
    setError,
    setGenerating,
    generating,
    setChats,
    
    // Request state from Zustand
    isRequesting,
    startRequest,
    stopRequest,
    resetRequestState
  } = store;

  // Group provider-related logic
  const providerSetup = {
    currentChat: chats?.[currentChatIndex],
    providerKey: chats?.[currentChatIndex]?.config.provider || DEFAULT_PROVIDER,
    get provider() {
      return providers[this.providerKey];
    },
    get apiKey() {
      return apiKeys[this.providerKey];
    }
  };

  // Create refs for services that need to persist
  const submissionLockRef = useRef(new SubmissionLock());
  const storageServiceRef = useRef(new StorageService(STORAGE_CONFIG));
  
  // Initialize stream handler with provider
  const streamHandlerRef = useRef<ChatStreamHandler>(
    new ChatStreamHandler(new TextDecoder(), providerSetup.provider)
  );

  // Title generator configuration
  const titleGeneratorConfig = {
    generateTitle: async (messages: MessageInterface[], config: ModelConfig) => {
      if (!config?.model) {
        throw new Error('Invalid model configuration');
      }

      const currentProvider = providers[providerSetup.providerKey];
      const modelConfig: ModelConfig = {
        ...config,
        model: config.model
      };

      const requestConfig: RequestConfig = {
        ...modelConfig,
        stream: false
      };

      const formattedRequest = currentProvider.formatRequest(messages, requestConfig);
      const { messages: formattedMessages, ...configWithoutMessages } = formattedRequest;

      try {
        const response = await getChatCompletion(
          providerSetup.providerKey,
          formattedMessages,
          modelConfig,
          providerSetup.apiKey
        );

        if (!response) {
          throw new Error('No response received from title generation');
        }

        return response;
      } catch (error) {
        console.error('Error in title generation:', error);
        throw error;
      }
    },
    language: i18n.language,
    defaultConfig: {
      ...DEFAULT_MODEL_CONFIG,
      model: providerSetup.provider.models[0]
    }
  } as const;

  // Group services for easier access
  const services: Services = {
    submission: submissionLockRef.current,
    storage: storageServiceRef.current,
    titleGeneration: useRef(new TitleGenerationService(
      new TitleGenerator(
        titleGeneratorConfig.generateTitle,
        i18n.language,
        titleGeneratorConfig.defaultConfig
      ),
      setChats
    )).current
  };

  // Add the submission state machine
  const submission = useSubmissionState();

  // Add a submitting ref to track active submissions
  const isSubmittingRef = useRef(false);

  // Stream handler effect - ONLY handle stream handler initialization
  useEffect(() => {
    console.log('🔄 Setting up stream handler with provider:', providerSetup.providerKey);
    streamHandlerRef.current = new ChatStreamHandler(new TextDecoder(), providerSetup.provider);
    
    // No state management in cleanup
    return () => {
      console.log('🧹 Cleaning up stream handler resources');
    };
  }, [providerSetup.provider]);

  // Component unmount effect - ensure we clean up any active requests
  useEffect(() => {
    return () => {
      // Only abort if we're not in a global submission
      if (isRequesting && !globalSubmissionManager.isSubmitting) {
        console.log('🧹 Component unmounting, stopping active request');
        stopRequest('Component unmounted');
      } else if (globalSubmissionManager.isSubmitting) {
        console.log('⚠️ Component unmounting during global submission - not aborting');
      }
    };
  }, [isRequesting, stopRequest]);

  // Chat state management utilities
  const chatUtils = {
    clone: (chats: ChatInterface[]): ChatInterface[] => 
      JSON.parse(JSON.stringify(chats)),

    appendAssistantMessage: (
      chats: ChatInterface[],
      chatIndex: number,
      content: string = ''
    ): ChatInterface[] => {
      const updatedChats = chatUtils.clone(chats);
      const messages = updatedChats[chatIndex].messages;
      messages.push({
        role: 'assistant',
        content
      });
      return updatedChats;
    },

    updateMessageContent: (
      chats: ChatInterface[],
      chatIndex: number,
      content: string
    ): ChatInterface[] => {
      const updatedChats = chatUtils.clone(chats);
      const messages = updatedChats[chatIndex].messages;
      const lastMessage = messages[messages.length - 1];
      
      if (lastMessage?.role === 'assistant') {
        lastMessage.content += content;
      }
      
      return updatedChats;
    }
  };

  // Error and state management utilities
  const utils = {
    createErrorMessage: (error: unknown): string => {
      if (error instanceof StorageQuotaError) {
        return 'Not enough storage space. Please clear some chats.';
      }
      if (error instanceof Error) {
        return error.message;
      }
      return 'An unknown error occurred';
    },

    getStoreState: () => {
      const state = useStore.getState();
      if (!state.chats || state.currentChatIndex < 0) {
        throw new Error('Invalid store state: chats array or currentChatIndex is invalid');
      }
      return state as { 
        chats: NonNullable<typeof state.chats>,
        currentChatIndex: number,
        [key: string]: any 
      };
    }
  };

  const stopGeneration = useCallback(() => {
    console.log('🛑 Stopping generation');
    submission.dispatch({ type: 'ABORT' });
    stopRequest('User stopped generation');
    globalSubmissionManager.abort('User stopped generation');
    setGenerating(false);
  }, [stopRequest, setGenerating, submission.dispatch]);

  const handleSubmit = useCallback(async () => {
    console.log('🚀 handleSubmit called');
    
    // Use global submission manager
    if (globalSubmissionManager.isSubmitting) {
      console.warn('⚠️ Global submission already in progress');
      return;
    }
    
    // Start global submission - no longer getting a controller
    globalSubmissionManager.startSubmission();
    
    try {
      if (!services.submission.lock()) {
        console.warn('⚠️ Submission canceled - already in progress');
        globalSubmissionManager.endSubmission();
        return;
      }
      
      // Start tracking with state machine
      submission.dispatch({ type: 'SUBMIT_START' });
      
      // Start request in Zustand - this creates the abort controller
      console.log('🔄 Starting request via Zustand');
      const controller = startRequest();
      
      // Check storage quota
      submission.dispatch({ type: 'PREPARING' });
      await services.storage.checkQuota();
      
      // Set generating state
      setGenerating(true);
      setError(null);
      
      // Get current state and prepare messages
      const currentState = utils.getStoreState();
      const updatedChats = chatUtils.appendAssistantMessage(
        currentState.chats,
        currentState.currentChatIndex
      );
      console.log('📝 Appending assistant message');
      setChats(updatedChats);
      
      // Prepare submission
      submission.dispatch({ type: 'SUBMITTING' });
      const currentChat = updatedChats[currentState.currentChatIndex];
      const currentMessages = currentChat.messages;
      
      // Get model configuration
      const modelConfig = {
        ...DEFAULT_MODEL_CONFIG,
        ...currentChat.config.modelConfig
      };
      
      // Create submission service - no longer passing controller
      console.log('🔧 Creating submission service');
      const submissionService = new ChatSubmissionService(
        providerSetup.provider,
        providerSetup.apiKey,
        (content) => {
          // Track streaming state
          submission.dispatch({ type: 'CONTENT_RECEIVED' });
          
          // Update content (existing code)
          const latestState = utils.getStoreState();
          const updatedChats = chatUtils.updateMessageContent(
            latestState.chats,
            latestState.currentChatIndex,
            content
          );
          setChats(updatedChats);
        },
        streamHandlerRef.current
        // No longer passing controller
      );
      
      // Submit request
      console.log('📤 Submitting request');
      submission.dispatch({ type: 'STREAMING' });
      await submissionService.submit(currentMessages, {
        ...modelConfig,
        stream: true
      } as ModelConfig);
      
      // Stream complete
      console.log('✅ Stream complete');
      submission.dispatch({ type: 'STREAM_COMPLETE' });
      
      // Generate title
      console.log('🏷️ Generating title');
      submission.dispatch({ type: 'GENERATING_TITLE' });
      await handleTitleGeneration();
      
      // Complete successfully
      console.log('🎉 Submission complete');
      submission.dispatch({ type: 'COMPLETE' });
      
    } catch (error: unknown) {
      // Track error state
      submission.dispatch({ type: 'ERROR', payload: error as Error });
      
      // Existing error handling
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('🛑 Request was aborted:', error.message);
      } else {
        console.error('❌ Submit error:', error);
        setError(utils.createErrorMessage(error));
      }
    } finally {
      // Clean up
      console.log('🧹 Cleaning up after submission');
      setGenerating(false);
      
      if (isRequesting) {
        console.log('🧹 Resetting request state in Zustand');
        resetRequestState();
      }
      
      services.submission.unlock();
      globalSubmissionManager.endSubmission();
    }
  }, [
    setGenerating, 
    setError, 
    setChats, 
    startRequest, 
    resetRequestState, 
    isRequesting,
    submission.dispatch
  ]);

  const regenerateMessage = useCallback(async () => {
    if (generating || !chats) {
      return;
    }

    const updatedChats = chatUtils.clone(chats);
    const currentMessages = updatedChats[currentChatIndex].messages;
    if (currentMessages[currentMessages.length - 1]?.role === 'assistant') {
      currentMessages.pop();
    }

    setChats(updatedChats);
    await handleSubmit();
  }, [generating, chats, currentChatIndex, setChats, handleSubmit]);

  const handleTitleGeneration = async () => {
    console.log('🏷️ handleTitleGeneration called');
    try {
      const currentState = utils.getStoreState();
      if (!currentState.chats || currentState.currentChatIndex < 0) {
        console.error('❌ No active chat found for title generation');
        throw new Error('No active chat found');
      }

      console.log('🏷️ Generating title for chat', currentState.currentChatIndex);
      
      await services.titleGeneration.generateAndUpdateTitle(
        currentState.chats[currentState.currentChatIndex].messages,
        currentState.currentChatIndex
      );
      console.log('🏷️ Title generation completed successfully');
    } catch (error) {
      console.error('❌ Title generation failed:', error);
      throw error;
    }
  };

  return { handleSubmit, stopGeneration, regenerateMessage, error, generating };
};

export default useSubmit;
