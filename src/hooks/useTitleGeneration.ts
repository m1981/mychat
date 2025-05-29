import { useRef, useCallback } from 'react';

import { DEFAULT_MODEL_CONFIG } from '@config/chat/config';
import { getChatCompletion } from '@src/api/api';
import { TitleGenerationService } from '@src/services/TitleGenerationService';
import { TitleGenerator } from '@src/services/TitleGenerator';
import useStore from '@store/store';
import { MessageInterface, ModelConfig } from '@type/chat';
import { RequestConfig } from '@type/provider';
import { providers } from '@type/providers';
import { useTranslation } from 'react-i18next';

export function useTitleGeneration(providerKey: string) {
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
      const response = await getChatCompletion(
        providerKey,
        formattedMessages,
        modelConfig,
        apiKeys[providerKey]
      );

      if (!response) {
        throw new Error('No response received from title generation');
      }

      return response;
    } catch (error) {
      console.error('Error in title generation:', error);
      throw error;
    }
  }, [providerKey, apiKeys]);
  
  // Create title generation service
  const titleGenerationService = useRef(new TitleGenerationService(
    new TitleGenerator(
      generateTitle,
      i18n.language,
      {
        ...DEFAULT_MODEL_CONFIG,
        model: providers[providerKey].models[0]
      }
    ),
    setChats
  )).current;
  
  // Handle title generation
  const handleTitleGeneration = useCallback(async () => {
    console.log('🏷️ handleTitleGeneration called');
    try {
      const currentState = useStore.getState();
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
  }, [titleGenerationService]);
  
  return { handleTitleGeneration };
}