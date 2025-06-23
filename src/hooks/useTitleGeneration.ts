import { useCallback } from 'react';
import useStore from '@store/store';
import { ProviderRegistry } from '@config/providers/provider.registry';
import { MessageInterface, ModelConfig, ProviderKey } from '@type/chat';
import { UseTitleGenerationReturn } from '@type/hooks';
import { debug } from '@utils/debug';

// Define the system prompt for title generation
const TITLE_SYSTEM_PROMPT = 'Generate a concise, descriptive title (5 words or less) for this conversation. Return only the title text with no quotes or additional explanation.';

export function useTitleGeneration(providerKey: ProviderKey): UseTitleGenerationReturn {
  // Get state and setChats directly
  const { chats, currentChatIndex, setChats } = useStore(state => ({
    chats: state.chats,
    currentChatIndex: state.currentChatIndex,
    setChats: state.setChats
  }));
  
  const generateTitle = useCallback(async (messages: MessageInterface[], config: ModelConfig, chatIndex?: number) => {
    debug.log('chat', `Generating title for chat. Messages: ${messages.length}, Provider: ${providerKey}`);
    
    try {
      // Skip if not enough messages
      if (messages.length < 2) {
        debug.log('chat', 'Not enough messages to generate title, skipping');
        return;
      }
      
      // Get the most current state at the time of title generation
      const currentState = useStore.getState();
      const targetChatIndex = chatIndex !== undefined ? chatIndex : currentState.currentChatIndex;
      
      debug.log('chat', `Target chat index: ${targetChatIndex}, Current chat index: ${currentState.currentChatIndex}`);
      
      // Only generate title if it hasn't been set yet
      const currentChat = currentState.chats[targetChatIndex];
      if (!currentChat || currentChat.titleSet) {
        debug.log('chat', `Chat already has title or doesn't exist. Title: "${currentChat?.title}", TitleSet: ${currentChat?.titleSet}`);
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
      
      debug.log('chat', `Creating title prompt with last user message: "${lastUserMessage.substring(0, 30)}..."`);
      
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
      const providerInstance = ProviderRegistry.getProvider(providerKey);
      debug.log('chat', `Using provider: ${providerInstance.id} for title generation`);
      
      // FIX: Ensure we're passing parameters in the correct order
      // First parameter should be messages array, second parameter should be config
      const formattedRequest = providerInstance.formatRequest(titlePrompt, {
        ...config,
        // Ensure stream is false for title generation
        stream: false
      });

      debug.log('chat', 'Submitting title generation request');
      // Submit request using the correct method from AIProviderInterface
      const response = await providerInstance.submitCompletion(formattedRequest);
      
      // Parse response using the correct method
      const parsedResponse = providerInstance.parseResponse(response);
      debug.log('chat', `Received title generation response: ${JSON.stringify(parsedResponse)}`);
      
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
        debug.log('chat', 'No title generated, using default');
        title = 'New Conversation';
      }
      
      debug.log('chat', `Generated title: "${title}"`);
      
      // Get the latest state again to ensure we have the most up-to-date messages
      const latestState = useStore.getState();
      const updatedChats = [...latestState.chats];
      updatedChats[targetChatIndex] = {
        ...updatedChats[targetChatIndex],
        title,
        titleSet: true
      };

      // Update store
      debug.log('chat', 'Updating chat with new title');
      setChats(updatedChats);
    } catch (error) {
      debug.error('chat', 'Error in title generation:', error);
      console.error('Error in title generation:', error);
    }
  }, [providerKey, setChats]);
  
  return { generateTitle };
}