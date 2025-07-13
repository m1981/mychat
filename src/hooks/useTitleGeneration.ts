import { useCallback } from 'react';
import { ProviderRegistry } from '@config/providers/provider.registry';
import useStore from '@store/store';
import { ProviderKey } from '@type/provider';
import { UseTitleGenerationReturn } from '@type/hooks';
import { debug } from '@utils/debug';
import { MessageInterface } from '@type/chat';
import { ModelConfig } from '@type/chat';

// Define the system prompt for title generation
const TITLE_SYSTEM_PROMPT = 'Generate a concise, descriptive title (5 words or less) for this conversation. Return only the title text with no quotes or additional explanation.';

export function useTitleGeneration(providerKey: ProviderKey): UseTitleGenerationReturn {
  // Get state and setChats directly
  const { chats, currentChatIndex, setChats, apiKeys } = useStore(state => ({
    chats: state.chats,
    currentChatIndex: state.currentChatIndex,
    setChats: state.setChats,
    apiKeys: state.apiKeys
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
      
      // Get API key from store
      const storeApiKeys = useStore.getState().apiKeys;
      const apiKey = storeApiKeys[providerKey];

      debug.log('chat', `API key for ${providerKey}: ${apiKey ? 'present' : 'missing'}`);
      debug.log('chat', `All API keys: ${JSON.stringify(Object.keys(storeApiKeys).map(k => [k, storeApiKeys[k] ? 'present' : 'missing']))}`);

      if (!apiKey) {
        debug.log('chat', `No API key found for ${providerKey}`);
        throw new Error(`No API key found for ${providerKey}`);
      }

      // Format the request using the provider's formatRequest method
      const formattedRequest = providerInstance.formatRequest(titlePrompt, {
        ...config,
        stream: false // Ensure stream is false for title generation
      });

      debug.log('chat', 'Submitting title generation request via API route');

      // Use the API route instead of direct client access
      // This follows the architecture diagram where all API calls go through the backend
      const response = await fetch(`/api/chat/${providerKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          formattedRequest,
          apiKey
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        debug.error('chat', `API route error: ${response.status} ${errorText}`);
        throw new Error(`API route returned ${response.status}: ${errorText}`);
      }
      
      const responseData = await response.json();
      debug.log('chat', `Received title generation response from API route`);

      // Parse the response using the provider's parseResponse method
      const parsedResponse = providerInstance.parseResponse(responseData);
      
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