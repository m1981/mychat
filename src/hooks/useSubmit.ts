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
  abortController: React.MutableRefObject<AbortController | null>;
  submission: SubmissionLock;
  storage: StorageService;
  titleGeneration: TitleGenerationService;
}

const useSubmit = () => {
  const { i18n } = useTranslation();
  const store = useStore();
  
  // Store access
  const {
    currentChatIndex,
    chats,
    apiKeys,
    error,
    setError,
    setGenerating,
    generating,
    setChats,
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
  
  // Single source of truth for request state
  const abortControllerRef = useRef<AbortController | null>(null);
  const isRequestActiveRef = useRef<boolean>(false);

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
    abortController: abortControllerRef,
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

  // Stream handler effect - ONLY handle stream handler initialization, not abort control
  useEffect(() => {
    console.log('🔄 Setting up stream handler with provider:', providerSetup.providerKey);
    streamHandlerRef.current = new ChatStreamHandler(new TextDecoder(), providerSetup.provider);
    console.log('🔄 Stream handler initialized');
    
    // No abort controller management in this cleanup
    return () => {
      console.log('🧹 Cleaning up stream handler resources - NO ABORT CONTROL HERE');
    };
  }, [providerSetup.provider]);

  // Separate effect for component unmount cleanup
  useEffect(() => {
    console.log('🔄 Setting up component unmount cleanup effect');
    
    return () => {
      console.log('🧹 Component UNMOUNT cleanup triggered');
      console.log('🧹 isRequestActive:', isRequestActiveRef.current);
      console.log('🧹 abortController exists:', !!services.abortController.current);
      
      if (services.abortController.current) {
        console.log('🧹 Aborting controller in component unmount');
        services.abortController.current.abort('Component unmounted');
        services.abortController.current = null;
        isRequestActiveRef.current = false;
        console.log('🧹 Reset request state in component unmount');
      }
    };
  }, []); // Empty dependency array means this only runs on mount/unmount

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
    console.log('⏹️ stopGeneration called');
    console.log('⏹️ isRequestActive:', isRequestActiveRef.current);
    console.log('⏹️ abortController exists:', !!services.abortController.current);
    
    if (services.abortController.current) {
      console.log('⚡ Aborting current request');
      services.abortController.current.abort('User stopped generation');
      console.log('⚡ Abort signal sent');
    } else {
      console.log('⚠️ No active request to abort');
    }
    
    // Always set generating to false to update UI
    setGenerating(false);
    console.log('⏹️ Generation state set to false');
  }, [setGenerating]);

  const handleSubmit = useCallback(async () => {
    console.log('🚀 handleSubmit called');
    
    if (!services.submission.lock()) {
      console.warn('⚠️ Submission already in progress');
      return;
    }
    
    console.log('🔒 Submission lock acquired');
    
    // Cancel any existing request first
    if (services.abortController.current) {
      console.log('🛑 Aborting existing request');
      services.abortController.current.abort('New request started');
    }
    
    // Create new controller and update state
    services.abortController.current = new AbortController();
    isRequestActiveRef.current = true;
    console.log('🎮 Created new AbortController', services.abortController.current);
    
    try {
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
      const updatedChats = chatUtils.clone(currentState.chats);
      const currentChat = updatedChats[currentState.currentChatIndex];
      const currentMessages = currentChat.messages;
      
      console.log('💬 Current messages before adding assistant message', 
        currentMessages.map(m => ({ role: m.role, contentLength: m.content.length }))
      );
      
      currentMessages.push({
        role: 'assistant',
        content: '',
      });
      
      console.log('💬 Updated messages after adding assistant message', 
        currentMessages.map(m => ({ role: m.role, contentLength: m.content.length }))
      );
      
      setChats(updatedChats);
      
      // Get model configuration from the chat
      console.log('⚙️ Chat config', currentChat.config);
      console.log('⚙️ Model config from chat', currentChat.config.modelConfig);
      console.log('⚙️ Default model config', DEFAULT_MODEL_CONFIG);
      
      const modelConfig: ModelConfig = {
        ...DEFAULT_MODEL_CONFIG,
        ...currentChat.config.modelConfig // Use modelConfig from chat config
      };
      
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
        services.abortController.current
      );
      
      console.log('📤 Submitting request');
      console.log('📤 Provider', providerSetup.providerKey);
      console.log('📤 API key exists', !!providerSetup.apiKey);
      console.log('📤 Messages count', currentMessages.length);
      
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
      
      // Only reset request state if this wasn't an abort
      if (services.abortController.current && 
          services.abortController.current.signal.reason !== 'User stopped generation') {
        console.log('🧹 Resetting request state - normal completion');
        isRequestActiveRef.current = false;
        services.abortController.current = null;
      } else {
        console.log('🧹 Not resetting request state - was aborted by user');
      }
      
      services.submission.unlock();
      console.log('🔓 Submission lock released');
    }
  }, [setGenerating, setError, setChats, providerSetup.provider, providerSetup.apiKey]);

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
      console.log('🏷️ Messages for title generation', 
        currentState.chats[currentState.currentChatIndex].messages.map(
          m => ({ role: m.role, contentLength: m.content.length })
        )
      );
      
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

  // Component cleanup
  useEffect(() => {
    console.log('🔄 Setting up cleanup effect');
    
    return () => {
      console.log('🧹 Cleanup effect triggered');
      console.log('🧹 isRequestActive:', isRequestActiveRef.current);
      console.log('🧹 abortController exists:', !!services.abortController.current);
      
      if (services.abortController.current) {
        console.log('🧹 Aborting controller in cleanup');
        services.abortController.current.abort('Component unmounted');
        services.abortController.current = null;
        isRequestActiveRef.current = false;
        console.log('🧹 Reset request state in cleanup');
      }
    };
  }, []);

  return { handleSubmit, stopGeneration, regenerateMessage, error, generating };
};

export default useSubmit;
