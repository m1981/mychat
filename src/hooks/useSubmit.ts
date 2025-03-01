import { useTranslation } from 'react-i18next';

import { getChatCompletion, getChatCompletionStream } from '@api/api';
import { DEFAULT_PROVIDER } from '@config/chat/ChatConfig';
import { DEFAULT_MODEL_CONFIG } from '@config/chat/ModelConfig';
import useStore from '@store/store';
import { ChatInterface, MessageInterface } from '@type/chat';
import { providers } from '@type/providers';
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

      const messages = chats[currentChatIndex].messages;
      const { modelConfig } = chats[currentChatIndex].config;
      
      console.log('📤 Sending request to:', `/api/chat/${providerKey}`);

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
      });

    console.log('📥 Response headers:', Object.fromEntries(response.headers.entries()));
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Response error:', errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const stream = response.body;
      if (!stream) {
        console.error('No stream received');
        setError('No response stream received');
        return;
      }

      const reader = stream.getReader();
      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            console.log('�完 Stream complete');
            break;
          }

        const chunk = decoder.decode(value);
          console.log('📦 Raw chunk received:', chunk);

        // Split chunk into lines and process each line
        const lines = chunk.split('\n');

          for (const line of lines) {
          if (!line.trim()) continue;

            if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            console.log('🔍 Processing data:', data);

              if (data === '[DONE]') {
              console.log('🏁 Received DONE signal');
              continue;
            }

              try {
                const parsed = JSON.parse(data);
                console.log('💫 Parsed JSON:', parsed);

                if (parsed.type === 'content_block_delta' &&
                    parsed.delta?.type === 'text_delta') {
                  const currentChats = useStore.getState().chats;
                if (!currentChats) continue;
                  
                  const lastMessageIndex = currentChats[currentChatIndex].messages.length - 1;
                  const updatedChats = JSON.parse(JSON.stringify(currentChats));
                const newContent = parsed.delta.text;
                  
                console.log('💬 Adding new content:', newContent);
                updatedChats[currentChatIndex].messages[lastMessageIndex].content += newContent;

                  setChats(updatedChats);
                }
              } catch (e) {
                console.error('❌ Failed to parse SSE chunk:', e);
              }
            }
          }
        }
      } catch (error) {
        console.error('❌ Stream processing error:', error);
        setError('Stream processing failed');
      } finally {
        console.log('🔚 Closing stream reader');
        reader.cancel();
      }

      console.log('✨ Starting title generation');
      await handleTitleGeneration();

    } catch (error) {
      console.error('❌ Submit error:', error);
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      setGenerating(false);
      console.log('🏷️ Generation complete');
    }
  };

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
