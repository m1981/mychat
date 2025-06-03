import { useRef, useCallback } from 'react';

import useStore from '@store/store';
import { MessageInterface, ModelConfig } from '@type/chat';
import { RequestConfig } from '@type/provider';

import { DEFAULT_MODEL_CONFIG } from '../constants';
import { ProviderKey, AIProvider } from '../types';
import { providers } from '../types/providers';

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

// Improved getChatCompletion function with better error handling
const getChatCompletion = async (
  providerKey: string,
  messages: any[],
  modelConfig: ModelConfig,
  apiKey: string
) => {
  try {
    // Validate messages
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      console.error('Invalid messages for title generation:', messages);
      return "New Chat";
    }

    const provider = getProvider(providerKey);
    const endpoint = `/api/chat/${providerKey}`;
    
    console.log('Title generation request:', {
      endpoint,
      messageCount: messages.length,
      model: modelConfig.model,
      stream: false,  // Log that we're using non-streaming mode
      messageSample: JSON.stringify(messages[0]).substring(0, 100) + '...'
    });
    
    // Ensure API key is available
    if (!apiKey) {
      console.error('No API key available for provider:', providerKey);
      return "New Chat";
    }
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages,
        config: {
          ...modelConfig,
          stream: false  // Ensure non-streaming mode is set in the request
        },
        apiKey
      })
    });
    
    if (!response.ok) {
      console.error(`API Error: ${response.status} ${response.statusText}`);
      return "New Chat"; // Return default title instead of throwing
    }
    
    const data = await response.json();
    if (!data) {
      console.error('Empty response from title generation');
      return "New Chat"; // Return default title for empty response
    }
    
    // Log the response structure to help debug
    console.log('Title generation response structure:', 
      Object.keys(data).length > 0 ? 
        `Keys: ${Object.keys(data).join(', ')}` : 
        'Empty object'
    );
    
    // Handle Anthropic's new response format directly
    if (providerKey === 'anthropic' && data.content && Array.isArray(data.content)) {
      // Extract text from Anthropic's content array
      const textContent = data.content.find(item => item.type === 'text')?.text;
      if (textContent) {
        console.log('Extracted title from Anthropic response:', textContent);
        // Clean up the title (remove quotes)
        return textContent.replace(/^["']|["']$/g, '');
      }
    }
    
    // Fall back to provider's parseResponse method
    const parsedResponse = provider.parseResponse(data);
    console.log('Title after provider parsing:', parsedResponse);
    return parsedResponse || "New Chat";
  } catch (error) {
    console.error('Error in getChatCompletion:', error);
    return "New Chat"; // Return default title on any error
  }
};

// Improved TitleGenerator class with better error handling
class TitleGenerator {
  constructor(
    private generateTitleFn: (messages: MessageInterface[], config: ModelConfig) => Promise<string>,
    private modelConfig: ModelConfig
  ) {}

  async generateTitle(messages: MessageInterface[]): Promise<string> {
    try {
      const title = await this.generateTitleFn(messages, this.modelConfig);
      return title || 'New Chat'; // Ensure we always have a title
    } catch (error) {
      console.error('Error generating title:', error);
      return 'New Chat'; // Default title on error
    }
  }
}

// Improved TitleGenerationService class with safer state updates
class TitleGenerationService {
  constructor(
    private titleGenerator: TitleGenerator,
    private setChats: any
  ) {}

  async generateAndUpdateTitle(messages: MessageInterface[], chatIndex: number): Promise<void> {
    try {
      // Skip if no messages or empty messages
      if (!messages || messages.length === 0) {
        console.warn('No messages provided for title generation');
        return;
      }

      // Check if messages have content
      const hasValidContent = messages.some(
        m => m.content && typeof m.content === 'string' && m.content.trim() !== ''
      );
      
      if (!hasValidContent) {
        console.warn('No valid content in messages for title generation');
        return;
      }

      // Generate title with error handling
      let title = "New Chat"; // Default title
      try {
        title = await this.titleGenerator.generateTitle(messages);
        console.log('Generated title:', title);
      } catch (error) {
        console.error('Title generation failed, using default title:', error);
        // Continue with default title
      }

      // Get current state and validate before updating
      const state = useStore.getState();
      if (!state.chats || !Array.isArray(state.chats)) {
        console.error('Invalid chats state:', state.chats);
        return; // Don't update invalid state
      }

      // Ensure chat index is valid
      if (chatIndex < 0 || chatIndex >= state.chats.length) {
        console.error(`Chat index ${chatIndex} out of bounds`);
        return;
      }

      // Create a safe copy of the chats array
      const updatedChats = [...state.chats];
      
      // Log before update
      console.log('Current chat title:', updatedChats[chatIndex].title);
      
      // Update the title
      updatedChats[chatIndex] = {
        ...updatedChats[chatIndex],
        title,
        titleSet: true
      };
      
      // Log after update
      console.log('Updated chat with new title:', title);
      
      // Update state directly with the new array
      this.setChats(updatedChats);
      
      // Verify state update
      setTimeout(() => {
        const newState = useStore.getState();
        console.log('Verified title update:', 
          newState.chats?.[chatIndex]?.title === title ? 
          'Success' : 'Failed',
          'Current title:', newState.chats?.[chatIndex]?.title
        );
      }, 100);
    } catch (error) {
      console.error('Failed to update title:', error);
      // Don't update state on error
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
      stream: false  // Explicitly set non-streaming mode
    };

    // Create a specific title generation prompt
    const titlePrompt: MessageInterface = {
      role: 'user',
      content: `Generate a title in less than 6 words for the following conversation:\n"""\n${
        messages.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n')
      }\n"""`,
    };

    // Format the request using the provider's formatter
    const formattedRequest = currentProvider.formatRequest([titlePrompt], requestConfig);
    const { messages: formattedMessages } = formattedRequest;

    try {
      console.log('Title generation request (non-streaming):', {
        provider: providerKey,
        model: modelConfig.model,
        stream: false
      });
      
      const response = await getChatCompletion(
        providerKey,
        formattedMessages,
        modelConfig,
        getApiKey(providerKey)
      );

      return response || "New Chat";
    } catch (error) {
      console.error('Error in title generation:', error);
      return "New Chat"; // Return default title on error
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
  
  // Improved handleTitleGeneration with better state validation
  const handleTitleGeneration = useCallback(async () => {
    console.log('🏷️ handleTitleGeneration called');
    try {
      const currentState = useStore.getState();
      
      // Validate state before proceeding
      if (!currentState.chats || !Array.isArray(currentState.chats)) {
        console.error('❌ Invalid chats state:', currentState.chats);
        return;
      }
      
      if (currentState.currentChatIndex < 0 || currentState.currentChatIndex >= currentState.chats.length) {
        console.error('❌ Invalid chat index:', currentState.currentChatIndex);
        return;
      }

      console.log('🏷️ Generating title for chat', currentState.currentChatIndex);
      
      await titleGenerationService.generateAndUpdateTitle(
        currentState.chats[currentState.currentChatIndex].messages,
        currentState.currentChatIndex
      );
      console.log('🏷️ Title generation completed successfully');
    } catch (error) {
      console.error('❌ Title generation failed:', error);
      // Error caught, state protected
    }
  }, [titleGenerationService]);
  
  return { handleTitleGeneration };
}