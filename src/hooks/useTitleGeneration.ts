import { useCallback } from 'react';
import useStore from '@store/store';
import { ProviderRegistry } from '@config/providers/provider.registry';
import { MessageInterface, ModelConfig, ProviderKey } from '@type/chat';
import { UseTitleGenerationReturn } from '@type/hooks';

// Define the system prompt for title generation
const TITLE_SYSTEM_PROMPT = 'Generate a concise, descriptive title (5 words or less) for this conversation. Return only the title text with no quotes or additional explanation.';

export function useTitleGeneration(providerKey: ProviderKey): UseTitleGenerationReturn {
  const store = useStore();
  const setChats = store.setChats;
  
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
      
      // Get current state - store is already the state in Zustand
      const { chats, currentChatIndex } = store;
      const targetChatIndex = chatIndex !== undefined ? chatIndex : currentChatIndex;
      
      // Only generate title if it hasn't been set yet
      const currentChat = chats[targetChatIndex];
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
      
      // Use the correct method from the AIProviderInterface
      const formattedRequest = providerInstance.formatRequest(titlePrompt, {
        ...config
      });

      console.log('Title generation request:', JSON.stringify(formattedRequest, null, 2));

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
      
      // Update chat title
      const updatedChats = [...chats];
      updatedChats[targetChatIndex] = {
        ...updatedChats[targetChatIndex],
        title,
        titleSet: true
      };
      
      setChats(updatedChats);
    } catch (error) {
      console.error('Error in title generation:', error);
    }
  }, [providerKey, store, setChats]);
  
  return { generateTitle };
}