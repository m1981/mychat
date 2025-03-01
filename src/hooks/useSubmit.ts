import { useTranslation } from 'react-i18next';

import { getChatCompletion, getChatCompletionStream } from '@api/api';
import { parseEventSource } from '@api/helper';
import { DEFAULT_PROVIDER } from '@config/chat/ChatConfig';
import { DEFAULT_MODEL_CONFIG } from '@config/chat/ModelConfig';
import useStore from '@store/store';
import { ChatInterface, MessageInterface } from '@type/chat';
import { providers} from '@type/providers';
import { checkStorageQuota } from '@utils/storage';

const useSubmit = () => {
  const currentChatIndex = useStore((state) => state.currentChatIndex);
  const chats = useStore((state) => state.chats);
  const currentChat = chats?.[currentChatIndex];
  
  const providerKey = currentChat?.config.provider || DEFAULT_PROVIDER;
  const provider = providers[providerKey]; // Use providers map instead of ProviderRegistry

  const apiKeys = useStore((state) => state.apiKeys);
  const currentApiKey = apiKeys[providerKey];

  const { i18n } = useTranslation('api');
  const error = useStore((state) => state.error);
  const setError = useStore((state) => state.setError);
  const setGenerating = useStore((state) => state.setGenerating);
  const generating = useStore((state) => state.generating);
  const setChats = useStore((state) => state.setChats);

  const generateTitle = async (message: MessageInterface[]): Promise<string> => {
    return await getChatCompletion(
      providerKey,
      message,
      currentChat?.config.modelConfig || DEFAULT_MODEL_CONFIG,
      currentApiKey
    );
  };

  const handleSubmit = async () => {
    const chats = useStore.getState().chats;
    if (generating || !chats) return;

    try {
      await checkStorageQuota();
      if (useStore.getState().error) return;

      const updatedChats: ChatInterface[] = JSON.parse(JSON.stringify(chats));
      updatedChats[currentChatIndex].messages.push({
        role: 'assistant',
        content: '',
      });

      setChats(updatedChats);
      setGenerating(true);

      if (chats[currentChatIndex].messages.length === 0) {
        setError('No messages submitted!');
        return;
      }

      const messages = chats[currentChatIndex].messages;
      const { modelConfig } = chats[currentChatIndex].config;
      const response = await getChatCompletionStream(
        providerKey,
        messages,
        modelConfig,
        currentApiKey
      );

      if (!response) {
        setError('No response received from API');
        return;
      }

      if (response instanceof ReadableStream) {
        const reader = response.getReader();
        let reading = true;

        while (reading && useStore.getState().generating) {
          const { done, value } = await reader.read();

          if (done) {
            reading = false;
            break;
          }

          if (value) {
            const decodedValue = new TextDecoder().decode(value);
            console.log('Received SSE data:', decodedValue);

            const result = parseEventSource(decodedValue);
            const resultString = result.reduce((output: string, curr) => {
              if (curr === '[DONE]') {
                reading = false;
                return output;
              }

              try {
                const content = provider.parseStreamingResponse(curr);
                return output + (content || '');
              } catch (err) {
                console.error('Error parsing stream response:', err);
                return output;
              }
            }, '');

            if (resultString) {
              const updatedChats: ChatInterface[] = JSON.parse(
                JSON.stringify(useStore.getState().chats)
              );
              const updatedMessages = updatedChats[currentChatIndex].messages;
              updatedMessages[updatedMessages.length - 1].content += resultString;
              setChats(updatedChats);
            }
          }
        }

        // Clean up stream resources
        if (!reading) {
          reader.cancel();
        }
      }

      // Handle title generation after successful response
      await handleTitleGeneration();

    } catch (error) {
      console.error('Submit error:', error);
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      setGenerating(false);
    }
  };

  // Extracted title generation logic to separate function
  const handleTitleGeneration = async () => {
    const currChats = useStore.getState().chats;
    if (
      useStore.getState().autoTitle &&
      currChats &&
      !currChats[currentChatIndex]?.titleSet
    ) {
      const messages_length = currChats[currentChatIndex].messages.length;
      const assistant_message =
        currChats[currentChatIndex].messages[messages_length - 1].content;
      const user_message =
        currChats[currentChatIndex].messages[messages_length - 2].content;

      const message: MessageInterface = {
        role: 'user',
        content: `Generate a title in less than 6 words for the following message (language: ${i18n.language}):\n"""\nUser: ${user_message}\nAssistant: ${assistant_message}\n"""`,
      };

      let title = (await generateTitle([message])).trim();
      if (title.startsWith('"') && title.endsWith('"')) {
        title = title.slice(1, -1);
      }
      const updatedChats: ChatInterface[] = JSON.parse(
        JSON.stringify(useStore.getState().chats)
      );
      updatedChats[currentChatIndex].title = title;
      updatedChats[currentChatIndex].titleSet = true;
      setChats(updatedChats);
    }
  };

  return { handleSubmit, error };
};

export default useSubmit;
