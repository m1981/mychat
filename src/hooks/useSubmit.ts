import { useRef, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { DEFAULT_PROVIDER } from '@config/chat/ChatConfig';
import { DEFAULT_MODEL_CONFIG } from '@config/chat/ModelConfig';
import useStore from '@store/store';
import { ChatInterface, MessageInterface, ModelConfig } from '@type/chat';
import { providers } from '@type/providers';
import { RequestConfig } from '@type/provider';
import { getChatCompletion } from '@src/api/api';
import { ChatStreamHandler } from '../handlers/ChatStreamHandler';
import { ChatSubmissionService } from '../services/SubmissionService';
import { TitleGenerator } from '../services/TitleGenerator';
import { SimulationService } from '../services/SimulationService';
import { StorageService, StorageQuotaError } from '../services/StorageService';
import { SubmissionLock } from '../services/SubmissionLock';

// Constants at the top
const STORAGE_CONFIG = {
  maxStorageSize: 10 * 1024 * 1024, // 10MB
  warningThreshold: 0.85 // 85%
} as const;

const useSubmit = () => {
  const { i18n } = useTranslation();
  const store = useStore();
  
  // Group service initializations
  const services = {
    abortController: useRef<AbortController | null>(null),
    submission: useRef(new SubmissionLock()).current,
    storage: useRef(new StorageService(STORAGE_CONFIG)).current,
    simulation: useRef(new SimulationService()).current,
  };

  // Type-safe store access
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

  // Initialize stream handler with provider
  const streamHandlerRef = useRef<ChatStreamHandler>(
    new ChatStreamHandler(new TextDecoder(), providerSetup.provider)
  );

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

  // Title generator configuration and initialization
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

  const titleGenerator = new TitleGenerator(
    titleGeneratorConfig.generateTitle,
    titleGeneratorConfig.language,
    titleGeneratorConfig.defaultConfig
  );

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

  // Simulation handling
  const simulationHandlers = {
    handleSimulatedSubmission: async (state: ReturnType<typeof utils.getStoreState>) => {
      console.log('🔧 Running in simulation mode');
      try {
        services.abortController.current = new AbortController();

        // Now state.chats is guaranteed to be defined
        const updatedChats = chatUtils.appendAssistantMessage(
          state.chats,
          state.currentChatIndex
        );
        setChats(updatedChats);

        await services.simulation.simulateStreamResponse(
          'This is a simulated response for testing purposes.',
          (content) => {
            const latestState = utils.getStoreState(); // Now guaranteed to have chats
            const updatedChats = chatUtils.updateMessageContent(
              latestState.chats,
              state.currentChatIndex,
              content
            );
            setChats(updatedChats);
          }
        );
      } catch (error) {
        console.error('Simulation error:', error);
        setError(utils.createErrorMessage(error));
      } finally {
        setGenerating(false);
        services.abortController.current = null;
        services.submission.unlock();
      }
    },

    isSimulationMode: (): boolean => 
      import.meta.env.DEV && import.meta.env.VITE_SIM_MODE === 'true',

    handleWordByWordSimulation: async (
      onContent: (content: string) => void
    ): Promise<void> => {
      const testMessage = "This is a simulated response. It will stream word by word to test the UI rendering. ";
      const words = testMessage.split(' ');
      
      try {
        for (const word of words) {
          // Check if generation should stop
          if (!useStore.getState().generating) {
            console.log('🛑 Simulation stopped - generating flag is false');
            return;
          }

          if (services.abortController.current?.signal.aborted) {
            console.log('🛑 Simulation stopped - abort signal received');
            return;
          }

          onContent(word + ' ');
          await new Promise<void>((resolve, reject) => {
            const timeoutId = setTimeout(resolve, 200);
            
            // Clean up timeout if aborted
            services.abortController.current?.signal.addEventListener('abort', () => {
              clearTimeout(timeoutId);
              reject(new Error('Aborted'));
            }, { once: true });
          });
        }
      } catch (error: unknown) {
        if (error instanceof Error && error.message === 'Aborted') {
          console.log('🛑 Simulation aborted cleanly');
          return;
        }
        console.error('❌ Simulation error:', error);
        throw error;
      }
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
      const state = utils.getStoreState(); // Now guaranteed to have chats
      await services.storage.checkQuota();
      
      setGenerating(true);
      setError(null);

      if (simulationHandlers.isSimulationMode()) {
        await simulationHandlers.handleSimulatedSubmission(state);
        return;
      }

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
            const latestState = utils.getStoreState(); // Now guaranteed to have chats
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
    console.log('Title generation config:', {
      providerKey: providerSetup.providerKey,
      provider: providerSetup.provider,
      modelConfig: providerSetup.currentChat?.config.modelConfig,
      defaultConfig: DEFAULT_MODEL_CONFIG
    });
    
    try {
      const currentState = utils.getStoreState();
      if (!currentState.chats || currentState.currentChatIndex < 0) {
        throw new Error('No active chat found');
      }

      const currentMessages = currentState.chats[currentState.currentChatIndex].messages;
      
      // Get the last user and assistant messages
      const lastUserMessage = currentMessages
        .slice()
        .reverse()
        .find(msg => msg.role === 'user')?.content || '';
      
      const lastAssistantMessage = currentMessages
        .slice()
        .reverse()
        .find(msg => msg.role === 'assistant')?.content || '';

      const title = await titleGenerator.generateChatTitle(lastUserMessage, lastAssistantMessage);
      console.log('Title generated:', title);

      // Update the chat title
      const updatedChats = [...currentState.chats];
      updatedChats[currentState.currentChatIndex] = {
        ...updatedChats[currentState.currentChatIndex],
        title,
        titleSet: true
      };
      setChats(updatedChats);
    } catch (error) {
      console.error('Title generation failed:', {
        error,
        state: useStore.getState()
      });
      // Re-throw the error as it was in the original implementation
      throw error;
    }
  };

  return { handleSubmit, stopGeneration, regenerateMessage, error, generating };
};

export default useSubmit;
