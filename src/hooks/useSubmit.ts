import { useTranslation } from 'react-i18next';
import { DEFAULT_PROVIDER } from '@config/chat/ChatConfig';
import { DEFAULT_MODEL_CONFIG } from '@config/chat/ModelConfig';
import useStore from '@store/store';
import { ChatInterface, MessageInterface } from '@type/chat';
import { providers } from '@type/providers';
import { getChatCompletion } from '@src/api/api';
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
      
      const formattedConfig = provider.formatRequest(messages, {
        ...modelConfig,
        stream: true
      });

      // Create AbortController for timeout
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

      const response = await fetch(`/api/chat/${providerKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify({
          messages: formattedConfig.messages,
          config: formattedConfig,
          apiKey: currentApiKey,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorText = await response.text();
        setError(errorText || `HTTP error! status: ${response.status}`);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        setError('Response body is null');
        return;
      }

      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          console.log('Stream complete');
          break;
        }

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim() !== '');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6); // Remove 'data: ' prefix
            
            if (data === '[DONE]') {
              continue;
            }

            try {
              const result = JSON.parse(data);
              const content = provider.parseStreamingResponse(result);
              
              if (content) {
                const updatedChats: ChatInterface[] = JSON.parse(
                  JSON.stringify(useStore.getState().chats)
                );
                const updatedMessages = updatedChats[currentChatIndex].messages;
                updatedMessages[updatedMessages.length - 1].content += content;
                setChats(updatedChats);
              }
            } catch (e) {
              console.error('Failed to parse chunk:', e);
              // Continue processing other chunks even if one fails
            }
          }
        }
      }

      // Generate title after stream is complete
      console.log('✨ Starting title generation');
      await handleTitleGeneration();
      console.log('🏷️ Title generation complete');

    } catch (error) {
      console.error('❌ Submit error:', error);
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      setGenerating(false);
    }
  };

  return { handleSubmit, error };
};

export default useSubmit;
