import { useTranslation } from 'react-i18next';
import { StoreState } from '@store/store';

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
    console.log('🚀 Starting submission...');

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
      
      // Create AbortController for timeout
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

      // Make the actual fetch request
      const response = await fetch(`/api/chat/${providerKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages,
          config: { ...modelConfig, stream: true },
          apiKey: currentApiKey,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(await response.text());
      }

      // Create EventSource from response URL
      const eventSource = new EventSource(response.url, {
        withCredentials: true,
      });

      eventSource.addEventListener('message', (event) => {
        const result = parseEventSource(event.data);
        const resultString = result.reduce((output: string, curr) => {
          if (curr === '[DONE]') {
            eventSource.close();
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
      });

      eventSource.addEventListener('error', (error) => {
        console.error('SSE Error:', error);
        eventSource.close();
        setError('Stream connection error');
        setGenerating(false);
      });

      // Cleanup when generating is set to false
      const cleanup = () => {
        if (eventSource.readyState !== EventSource.CLOSED) {
          eventSource.close();
        }
      };

      // Add cleanup to store state changes - fixed subscription
      const unsubscribe = useStore.subscribe((state: StoreState) => {
        if (!state.generating) {
          cleanup();
        }
      });

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
