import { useRef, useCallback } from 'react';

import { DEFAULT_MODEL_CONFIG } from '@config/chat/ModelConfig';
import { ChatSubmissionService } from '@src/services/SubmissionService';
import { TitleGenerationService } from '@src/services/TitleGenerationService';
import { TitleGenerator } from '@src/services/TitleGenerator';
import useStore from '@store/store';
import { MessageInterface, ModelConfig } from '@type/chat';
import { RequestConfig } from '@type/provider';
import { providers } from '@type/providers';
import { useTranslation } from 'react-i18next';

// Create a minimal stream handler object
const emptyStreamHandler = {
  processStream: async () => {}
};

export function useTitleGeneration(providerKey: string, dependencies: any = {}) {
  const { i18n } = useTranslation();
  const setChats = useStore(state => state.setChats);
  const apiKeys = useStore(state => state.apiKeys); // Get apiKeys from store
  
  // Title generator configuration
  const generateTitle = useCallback(async (messages: MessageInterface[], config: ModelConfig) => {
    if (!config?.model) {
      throw new Error('Invalid model configuration');
    }

    const currentProvider = providers[providerKey];
    
    // Debug the API keys and provider key
    console.log('🔑 Title generation - Provider key:', providerKey);
    console.log('🔑 Title generation - Available API keys:', Object.keys(apiKeys || {}));
    
    // Get the API key for the current provider
    const apiKey = apiKeys?.[providerKey];
    
    // Check if API key exists
    if (!apiKey) {
      // Get the current state to check if API keys are available
      const currentState = useStore.getState();
      console.log('🔑 Title generation - Current state API keys:', Object.keys(currentState.apiKeys || {}));
      
      throw new Error(`No API key found for provider: ${providerKey}`);
    }
    
    // Create a non-streaming request config
    const requestConfig: RequestConfig = {
      ...config,
      stream: false
    };

    // Format the request using the non-streaming config
    const formattedRequest = currentProvider.formatRequest(messages, requestConfig);
    const { messages: formattedMessages } = formattedRequest;

    try {
      const submissionService = new ChatSubmissionService(
        currentProvider,
        apiKey,  // Use the API key from store
        () => {},
        emptyStreamHandler
      );
      
      // Pass the non-streaming requestConfig to submit
      const response = await submissionService.submit(
        formattedMessages,
        requestConfig  // Use requestConfig instead of modelConfig
      );

      if (response === undefined || response === null || response === '') {
        throw new Error('No response received from title generation');
      }

      return response;
    } catch (error) {
      console.error('Error in title generation:', error);
      throw error;
    }
  }, [providerKey, apiKeys]); // Add apiKeys to dependency array
  
  // Handle title generation
  const handleTitleGeneration = useCallback(async () => {
    console.log('🏷️ handleTitleGeneration called');
    try {
      // Use injected store or default
      const storeToUse = dependencies.store || useStore;
      const currentState = storeToUse.getState();
      
      // Debug API keys in the current state
      console.log('🔑 handleTitleGeneration - Provider key:', providerKey);
      console.log('🔑 handleTitleGeneration - Available API keys:', Object.keys(currentState.apiKeys || {}));
      
      if (!currentState.chats || currentState.currentChatIndex < 0) {
        console.error('❌ No active chat found for title generation');
        throw new Error('No active chat found');
      }

      console.log('🏷️ Generating title for chat', currentState.currentChatIndex);
      
      // Get the API key directly from the current state
      const apiKey = currentState.apiKeys?.[providerKey];
      if (!apiKey) {
        throw new Error(`No API key found for provider: ${providerKey} in handleTitleGeneration`);
      }
      
      // Create a new title generator with the current API key
      const titleGenerator = new TitleGenerator(
        async (messages, config) => {
          if (!config?.model) {
            throw new Error('Invalid model configuration');
          }
          
          const currentProvider = providers[providerKey];
          
          // Create a non-streaming request config
          const requestConfig: RequestConfig = {
            ...config,
            stream: false
          };
          
          // Format the request using the non-streaming config
          const formattedRequest = currentProvider.formatRequest(messages, requestConfig);
          const { messages: formattedMessages } = formattedRequest;
          
          const submissionService = new ChatSubmissionService(
            currentProvider,
            apiKey,  // Use the API key from current state
            () => {},
            emptyStreamHandler
          );
          
          // Pass the non-streaming requestConfig to submit
          const response = await submissionService.submit(
            formattedMessages,
            requestConfig
          );
          
          if (response === undefined || response === null || response === '') {
            throw new Error('No response received from title generation');
          }
          
          return response;
        },
        i18n.language,
        {
          ...DEFAULT_MODEL_CONFIG,
          model: providers[providerKey].models[0]
        }
      );
      
      // Create a new title generation service with the current title generator
      const titleGenerationService = new TitleGenerationService(
        titleGenerator,
        setChats
      );
      
      await titleGenerationService.generateAndUpdateTitle(
        currentState.chats[currentState.currentChatIndex].messages,
        currentState.currentChatIndex
      );
      
      console.log('🏷️ Title generation completed successfully');
    } catch (error) {
      console.error('❌ Title generation failed:', error);
      throw error;
    }
  }, [providerKey, i18n.language, setChats, dependencies.store]);
  
  return { handleTitleGeneration };
}