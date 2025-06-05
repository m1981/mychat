import { useCallback } from 'react';
import useStore from '@store/store';
import { ProviderRegistry } from '@config/providers/provider.registry';
import { MessageInterface, ModelConfig, ProviderKey } from '@type/chat';
import { UseTitleGenerationReturn } from '@type/hooks';

// Define the system prompt for title generation
const TITLE_SYSTEM_PROMPT = 'Generate a concise, descriptive title (5 words or less) for this conversation. Return only the title text with no quotes or additional explanation.';

export function useTitleGeneration(providerKey: ProviderKey): UseTitleGenerationReturn {
  // Get state and setChats directly
  const { chats, currentChatIndex, setChats } = useStore(state => ({
    chats: state.chats,
    currentChatIndex: state.currentChatIndex,
    setChats: state.setChats
  }));
  
  const generateTitle = useCallback(async (
    messages: MessageInterface[], 
    config: ModelConfig,
    chatIndex?: number
  ) => {
    try {
      // Skip if not enough messages
      if (messages.length < 2) {
        return;
      }
      
      // Get the most current state at the time of title generation
      const currentState = useStore.getState();
      const targetChatIndex = chatIndex !== undefined ? chatIndex : currentState.currentChatIndex;
      
      // Only generate title if it hasn't been set yet
      const currentChat = currentState.chats[targetChatIndex];
      if (!currentChat || currentChat.titleSet) {
        return;
      }
      
      // Create title prompt
      const lastUserMessage = messages
        .slice()
        .reverse()
        .find(msg => msg.role === 'user')?.content || '';
      
      const lastAssistantMessage = messages
        .slice()
        .reverse()
        .find(msg => msg.role === 'assistant')?.content || '';
      
      const titlePrompt = [
        {
          role: 'system',
          content: TITLE_SYSTEM_PROMPT
        },
        {
          role: 'user',
          content: `Generate a title for this conversation:\nUser: ${lastUserMessage}\nAssistant: ${lastAssistantMessage}`
        }
      ];
      
      // Get provider implementation from registry
      const providerInstance = ProviderRegistry.getProviderImplementation(providerKey);
      
      // FIX: Ensure we're passing parameters in the correct order
      // First parameter should be messages array, second parameter should be config
      const formattedRequest = providerInstance.formatRequest(titlePrompt, {
        ...config,
        // Ensure stream is false for title generation
        stream: false
      });

      // Submit request using the correct method from AIProviderInterface
      const response = await providerInstance.submitCompletion(formattedRequest);
      
      // Parse response using the correct method
      const parsedResponse = providerInstance.parseResponse(response);
      
      // Extract title from response
      let title = '';
      if (typeof parsedResponse === 'string') {
        title = parsedResponse;
      } else if (parsedResponse.choices && Array.isArray(parsedResponse.choices)) {
        title = parsedResponse.choices[0]?.message?.content || '';
      }
      
      // Clean up title
      title = title
        .trim()
        .replace(/^["'`]|["'`]$/g, '')
        .replace(/["'`]/g, '')
        .replace(/^[^\w\s]|[^\w\s]$/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      
      if (!title) {
        title = 'New Conversation';
      }
      
      // Get the latest state again to ensure we have the most up-to-date messages
      const latestState = useStore.getState();
      const updatedChats = [...latestState.chats];
      updatedChats[targetChatIndex] = {
        ...updatedChats[targetChatIndex],
        title,
        titleSet: true
      };

      // Update store
      setChats(updatedChats);
    } catch (error) {
      console.error('Error in title generation:', error);
    }
  }, [providerKey, setChats]);
  
  return { generateTitle };
}