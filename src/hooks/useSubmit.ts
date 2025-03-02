import { useTranslation } from 'react-i18next';

import { DEFAULT_PROVIDER } from '@config/chat/ChatConfig';
import { DEFAULT_MODEL_CONFIG } from '@config/chat/ModelConfig';
import useStore from '@store/store';
import { parseEventSource } from '@src/api/helper';
import { ChatInterface, MessageInterface } from '@type/chat';
import { providers } from '@type/providers';
import { getChatCompletion, getChatCompletionStream } from '@src/api/api';
import { checkStorageQuota } from '@utils/storage';

const useSubmit = () => {
  const currentChatIndex = useStore((state) => state.currentChatIndex);
  const chats = useStore((state) => state.chats);
  const currentChat = chats?.[currentChatIndex];
  
  const providerKey = currentChat?.config.provider || DEFAULT_PROVIDER;
  const provider = providers[providerKey];

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
    console.log('🚀 Starting submission...'); // Initial log

    const chats = useStore.getState().chats;
    if (generating || !chats) return;

    try {
      console.log('🚀 Starting submission process...');
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

      if (response instanceof ReadableStream) {  // Type check for stream
        const reader = response.getReader();
        let reading = true;

        while (reading && useStore.getState().generating) {
          const { done, value } = await reader.read();

          if (done) {
            console.log('�完 Stream complete');
            break;
          }

          if (value) {
            const decodedValue = new TextDecoder().decode(value);
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

        if (useStore.getState().generating) {
          reader.cancel('Cancelled by user');
        } else {
          reader.cancel('Generation completed');
        }
        reader.releaseLock();
        response.cancel();  // Change 'stream' to 'response'
      }

      // generate title for new chats
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
    } catch (e: unknown) {
      const err = (e as Error).message;
      console.log(err);
      setError(err);
    }
    setGenerating(false);
  };

  return { handleSubmit, error };
};

export default useSubmit;
