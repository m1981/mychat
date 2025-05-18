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
  const apiKeys = useStore(state => state.apiKeys);
  
  // Title generator configuration
  const generateTitle = useCallback(async (messages: MessageInterface[], config: ModelConfig) => {
    if (!config?.model) {
      throw new Error('Invalid model configuration');
    }

    const currentProvider = providers[providerKey];
    const modelConfig: ModelConfig = {
      ...config,
      model: config.model
    };

    const requestConfig: RequestConfig = {
      ...modelConfig,
      stream: false
    };

    const formattedRequest = currentProvider.formatRequest(messages, requestConfig);
    const { messages: formattedMessages } = formattedRequest;

    try {
      // Replace getChatCompletion with ChatSubmissionService
      const submissionService = new ChatSubmissionService(
        currentProvider,
        apiKeys[providerKey],
        // Pass an empty function for the onUpdate parameter
        () => {},
        // Pass a proper stream handler object
        emptyStreamHandler
      );
      
      const response = await submissionService.submit(
        formattedMessages,
        modelConfig
      );

      // Check if response is undefined, null, or empty string
      if (response === undefined || response === null || response === '') {
        throw new Error('No response received from title generation');
      }

      return response;
    } catch (error) {
      console.error('Error in title generation:', error);
      throw error;
    }
  }, [providerKey, apiKeys]);
  
  // Use injected service or create a new one
  const titleGenerationService = useRef(
    dependencies.titleGenerationService || 
    new TitleGenerationService(
      new TitleGenerator(
        generateTitle,
        i18n.language,
        {
          ...DEFAULT_MODEL_CONFIG,
          model: providers[providerKey].models[0]
        }
      ),
      setChats
    )
  ).current;
  
  // Handle title generation
  const handleTitleGeneration = useCallback(async () => {
    console.log('🏷️ handleTitleGeneration called');
    try {
      // Use injected store or default
      const storeToUse = dependencies.store || useStore;
      const currentState = storeToUse.getState();
      if (!currentState.chats || currentState.currentChatIndex < 0) {
        console.error('❌ No active chat found for title generation');
        throw new Error('No active chat found');
      }

      console.log('🏷️ Generating title for chat', currentState.currentChatIndex);
      
      await titleGenerationService.generateAndUpdateTitle(
        currentState.chats[currentState.currentChatIndex].messages,
        currentState.currentChatIndex
      );
      console.log('🏷️ Title generation completed successfully');
    } catch (error) {
      console.error('❌ Title generation failed:', error);
      throw error;
    }
  }, [titleGenerationService, dependencies.store]);
  
  return { handleTitleGeneration };
}