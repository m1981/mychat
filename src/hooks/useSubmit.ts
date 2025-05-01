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
      if (isRequesting) {
        console.log('🧹 Component unmounting, stopping active request');
        stopRequest('Component unmounted');
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
    stopRequest('User stopped generation');
    setGenerating(false);
  }, [stopRequest, setGenerating]);

  const handleSubmit = useCallback(async () => {
    console.log('🚀 handleSubmit called');
    
    if (!services.submission.lock()) {
      console.warn('⚠️ Submission already in progress');
      return;
    }
    
    console.log('🔒 Submission lock acquired');
    
    try {
      // Start request and get controller from Zustand
      const controller = startRequest();
      console.log('🎮 Created new AbortController via Zustand');
      
      console.log('📊 Checking storage quota');
      await services.storage.checkQuota();
      
      console.log('🔄 Setting generating state');
      setGenerating(true);
      setError(null);
      
      // Get current state
      const currentState = utils.getStoreState();
      console.log('📝 Current state retrieved', {
        chatIndex: currentState.currentChatIndex,
        chatCount: currentState.chats.length
      });
      
      // Initialize chat with empty assistant message
      console.log('💬 Current messages before adding assistant message', 
        currentState.chats[currentState.currentChatIndex].messages);
      
      const updatedChats = chatUtils.appendAssistantMessage(
        currentState.chats,
        currentState.currentChatIndex
      );
      
      console.log('💬 Updated messages after adding assistant message', 
        updatedChats[currentState.currentChatIndex].messages);
      
      setChats(updatedChats);
      
      // Get messages and model config
      const currentChat = updatedChats[currentState.currentChatIndex];
      const currentMessages = currentChat.messages;
      
      console.log('⚙️ Chat config', currentChat.config);
      
      // Get model configuration from the chat
      const modelConfig: ModelConfig = {
        ...DEFAULT_MODEL_CONFIG,
        ...currentChat.config.modelConfig
      };
      
      console.log('⚙️ Model config from chat', currentChat.config.modelConfig);
      console.log('⚙️ Default model config', DEFAULT_MODEL_CONFIG);
      console.log('⚙️ Final model config', modelConfig);
      
      // Create submission service with the controller
      console.log('🔧 Creating submission service');
      const submissionService = new ChatSubmissionService(
        providerSetup.provider,
        providerSetup.apiKey,
        (content) => {
          console.log('📨 Received content chunk', { length: content.length });
          const latestState = utils.getStoreState();
          const updatedChats = chatUtils.updateMessageContent(
            latestState.chats,
            latestState.currentChatIndex,
            content
          );
          setChats(updatedChats);
        },
        streamHandlerRef.current,
        controller
      );
      
      console.log('📤 Submitting request');
      
      try {
        // Use type assertion to add stream property
        await submissionService.submit(currentMessages, {
          ...modelConfig,
          stream: true
        } as ModelConfig);
        console.log('✅ Submission completed successfully');
      } catch (submissionError) {
        console.error('❌ Submission error:', submissionError);
        throw submissionError;
      }
      
      console.log('🏷️ Starting title generation');
      await handleTitleGeneration();
      console.log('🏷️ Title generation completed');
      
    } catch (error: unknown) {
      // Specifically handle abort errors
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('🛑 Request was aborted:', error.message);
      } else {
        console.error('❌ Submit error:', error);
        setError(utils.createErrorMessage(error));
      }
    } finally {
      // Clean up regardless of success or failure
      console.log('🧹 Cleaning up after submission');
      
      setGenerating(false);
      
      // Only reset if not aborted by user
      if (isRequesting) {
        console.log('🧹 Resetting request state in Zustand');
        resetRequestState();
      }
      
      services.submission.unlock();
      console.log('🔓 Submission lock released');
    }
  }, [
    setGenerating, 
    setError, 
    setChats, 
    startRequest, 
    resetRequestState, 
    isRequesting
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
