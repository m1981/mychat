import { useRef, useCallback } from 'react';
import { ProviderKey, AIProvider } from '../types';
import { providers } from '../types/providers';
import useStore from '@store/store';
import { MessageInterface, ModelConfig } from '@type/chat';
import { RequestConfig } from '@type/provider';
import { DEFAULT_MODEL_CONFIG } from '../constants';

// Add type guard for provider key
const isProviderKey = (key: string): key is ProviderKey => 
  key === 'openai' || key === 'anthropic';

// Use type guard before accessing providers
const getProvider = (key: string): AIProvider => {
  if (isProviderKey(key)) {
    return providers[key];
  }
  // Default to anthropic if invalid
  return providers['anthropic'];
};

// Get API key with type safety
const getApiKey = (key: string): string => {
  const apiKeys = useStore.getState().apiKeys;
  if (isProviderKey(key)) {
    return apiKeys[key] || '';
  }
  return '';
};

// Add missing getChatCompletion function
const getChatCompletion = async (
  providerKey: string,
  messages: any[],
  modelConfig: ModelConfig,
  apiKey: string
) => {
  // Implementation of chat completion
  // This is a placeholder - implement according to your API
  try {
    const provider = getProvider(providerKey);
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        provider: providerKey,
        messages,
        ...modelConfig
      })
    });
    
    const data = await response.json();
    return provider.parseResponse(data);
  } catch (error) {
    console.error('Error in getChatCompletion:', error);
    throw error;
  }
};

// Add TitleGenerator class
class TitleGenerator {
  constructor(
    private generateTitleFn: (messages: MessageInterface[], config: ModelConfig) => Promise<string>,
    private modelConfig: ModelConfig
  ) {}

  async generateTitle(messages: MessageInterface[]): Promise<string> {
    try {
      return await this.generateTitleFn(messages, this.modelConfig);
    } catch (error) {
      console.error('Error generating title:', error);
      return 'New Chat';
    }
  }
}

// Add TitleGenerationService class
class TitleGenerationService {
  constructor(
    private titleGenerator: TitleGenerator,
    private setChats: any // Use any to avoid type conflicts
  ) {}

  async generateAndUpdateTitle(messages: MessageInterface[], chatIndex: number): Promise<void> {
    try {
      const title = await this.titleGenerator.generateTitle(messages);
      this.setChats((chats: any[]) => 
        chats.map((chat, i) => 
          i === chatIndex ? { ...chat, title, titleSet: true } : chat
        )
      );
    } catch (error) {
      console.error('Failed to generate title:', error);
    }
  }
}

export function useTitleGeneration(providerKey: string) {
  const setChats = useStore(state => state.setChats);
  const apiKeys = useStore(state => state.apiKeys);
  
  // Title generator configuration
  const generateTitle = useCallback(async (messages: MessageInterface[], config: ModelConfig) => {
    if (!config?.model) {
      throw new Error('Invalid model configuration');
    }

    const currentProvider = getProvider(providerKey);
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
        getApiKey(providerKey)
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
  
  // Create title generation service with updated constructor
  const titleGenerationService = useRef(new TitleGenerationService(
    new TitleGenerator(
      generateTitle,
      {
        ...DEFAULT_MODEL_CONFIG,
        model: getProvider(providerKey).models[0]
      }
    ),
    setChats
  )).current;
  
  // Handle title generation with proper error handling
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