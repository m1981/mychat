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
  const abortControllerRef = useRef<AbortController | null>(null);

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

  // Stream handler effect
  useEffect(() => {
    streamHandlerRef.current = new ChatStreamHandler(new TextDecoder(), providerSetup.provider);
    
    return () => {
      console.log('🧹 Cleaning up resources');
      if (services.abortController.current) {
        services.abortController.current.abort();
        services.abortController.current = null;
      }
    };
  }, [providerSetup.provider]);

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
    console.log('🛑 Stop generation requested');
    setGenerating(false);
    
    if (services.abortController.current) {
      console.log('⚡ Aborting current request');
      services.abortController.current.abort();
      services.abortController.current = null;
    }
  }, [setGenerating]);

  const handleSubmit = async () => {
    if (!services.submission.lock()) {
      console.warn('Submission already in progress');
      return;
    }

    try {
      const state = utils.getStoreState();
      await services.storage.checkQuota();
      
      setGenerating(true);
      setError(null);

      console.log('🚀 Starting submission');
      services.abortController.current = new AbortController();

      try {
        // Initialize chat with empty assistant message
        const updatedChats = chatUtils.clone(state.chats);
        const currentMessages = updatedChats[state.currentChatIndex].messages;
        currentMessages.push({
          role: 'assistant',
          content: '',
        });
        setChats(updatedChats);

        const { modelConfig } = updatedChats[state.currentChatIndex].config;
        
        // Create submission service
        const submissionService = new ChatSubmissionService(
          providerSetup.provider,
          providerSetup.apiKey,
          (content) => {
            const latestState = utils.getStoreState();
            const updatedChats = chatUtils.updateMessageContent(
              latestState.chats,
              state.currentChatIndex,
              content
            );
            setChats(updatedChats);
          },
          streamHandlerRef.current
        );

        // Submit request
        await submissionService.submit(currentMessages, modelConfig);
        await handleTitleGeneration();

      } catch (error) {
        console.error('❌ Submit error:', error);
        setError(utils.createErrorMessage(error));
      } finally {
        setGenerating(false);
        services.abortController.current = null;
        services.submission.unlock();
      }
    } catch (error) {
      setError(utils.createErrorMessage(error));
      services.submission.unlock();
    }
  };

  const regenerateMessage = async () => {
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
  };

  const handleTitleGeneration = async () => {
    try {
      const currentState = utils.getStoreState();
      if (!currentState.chats || currentState.currentChatIndex < 0) {
        throw new Error('No active chat found');
      }

      await services.titleGeneration.generateAndUpdateTitle(
        currentState.chats[currentState.currentChatIndex].messages,
        currentState.currentChatIndex
      );
    } catch (error) {
      console.error('Title generation failed:', error);
      throw error;
    }
  };

  return { handleSubmit, stopGeneration, regenerateMessage, error, generating };
};

export default useSubmit;
