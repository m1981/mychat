import useStore from '@store/store';
import { useTranslation } from 'react-i18next';
import { ChatInterface, MessageInterface } from '@type/chat';
import { getChatCompletion, getChatCompletionStream } from '@api/api';
import { parseEventSource } from '@api/helper';
import { limitMessageTokens } from '@utils/messageUtils';
import { _defaultModelConfig, DEFAULT_PROVIDER } from '@constants/chat';
import { ProviderRegistry } from '@config/providers/provider.registry';
import { checkStorageQuota } from '@utils/storage';

const useSubmit = () => {
  const currentChatIndex = useStore((state) => state.currentChatIndex);
  const chats = useStore((state) => state.chats);
  const currentChat = chats?.[currentChatIndex];
  
  const currentProvider = ProviderRegistry.getProvider(currentChat?.config.provider || DEFAULT_PROVIDER);

  // Get API credentials based on chat's provider
  const apiKeys = useStore((state) => state.apiKeys);
  const currentApiKey = apiKeys[currentProvider];

  const { i18n } = useTranslation('api');
  const error = useStore((state) => state.error);
  const setError = useStore((state) => state.setError);
  const setGenerating = useStore((state) => state.setGenerating);
  const generating = useStore((state) => state.generating);
  const setChats = useStore((state) => state.setChats);

  const generateTitle = async (message: MessageInterface[]): Promise<string> => {
    return await getChatCompletion(
      currentProvider,
      message,
      currentChat?.config.modelConfig || _defaultModelConfig,
      currentApiKey
    );
  };

  const handleSubmit = async () => {
    const chats = useStore.getState().chats;
    if (generating || !chats) return;

    try {
      // Check storage quota before proceeding
      console.log("before")
      await checkStorageQuota();
      console.log("after")
      // If there's a storage-related error, don't proceed
      if (useStore.getState().error) {
        return;
      }

      const updatedChats: ChatInterface[] = JSON.parse(JSON.stringify(chats));
      updatedChats[currentChatIndex].messages.push({
        role: 'assistant',
        content: '',
      });

      setChats(updatedChats);
      setGenerating(true);

      let stream;
      if (chats[currentChatIndex].messages.length === 0) {
        setError('No messages submitted!');
        return;
      }

      const messages = limitMessageTokens(
        chats[currentChatIndex].messages,
        chats[currentChatIndex].config.modelConfig.max_tokens,
        chats[currentChatIndex].config.modelConfig.model
      );

      const { modelConfig } = chats[currentChatIndex].config;
      stream = await getChatCompletionStream(
        currentProvider,
        messages,
        modelConfig,
        currentApiKey
      );

      if (stream instanceof ReadableStream) {
        if ('locked' in stream && stream.locked) {
          setError('Oops, the stream is locked right now. Please try again');
          return;
        }
        const reader = stream.getReader();
        let reading = true;

        while (reading && useStore.getState().generating) {
          const { done, value } = await reader.read();

          if (done) {
            reading = false;
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
                const content = currentProvider.parseStreamingResponse(curr);
                return output + (content || '');
              } catch (err) {
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
        stream.cancel();
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
