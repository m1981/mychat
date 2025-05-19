import { useCallback } from 'react';
import useStore from '@store/store';
import { MessageInterface, ModelConfig } from '@type/chat';
import { useProvider } from '@contexts/ProviderContext';

export function useTitleGeneration() {
  const provider = useProvider();
  const setChats = useStore(state => state.setChats);
  
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
      
      // Get current state
      const currentState = useStore.getState();
      const { chats } = currentState;
      const targetChatIndex = chatIndex !== undefined ? chatIndex : currentState.currentChatIndex;
      
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
          content: 'Generate a concise, descriptive title (5 words or less) for this conversation. Return only the title text with no quotes or additional explanation.'
        },
        {
          role: 'user',
          content: `Generate a title for this conversation:\nUser: ${lastUserMessage}\nAssistant: ${lastAssistantMessage}`
        }
      ];
      
      // Format request using provider
      const formattedRequest = provider.formatRequest(
        { ...config, stream: false },
        titlePrompt
      );
      
      // Submit request
      const response = await provider.submitCompletion(formattedRequest);
      
      // Extract title from response
      let title = '';
      if (typeof response.content === 'string') {
        title = response.content;
      } else if (response.choices && Array.isArray(response.choices)) {
        title = response.choices[0]?.message?.content || '';
      } else if (response.delta && typeof response.delta.text === 'string') {
        title = response.delta.text;
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
  }, [provider, setChats]);
  
  return { generateTitle };
}