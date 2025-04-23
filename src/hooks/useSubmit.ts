import { useTranslation } from 'react-i18next';
import { DEFAULT_PROVIDER } from '@config/chat/ChatConfig';
import { DEFAULT_MODEL_CONFIG } from '@config/chat/ModelConfig';
import useStore from '@store/store';
import { ChatInterface, MessageInterface, ModelConfig } from '@type/chat';
import { providers } from '@type/providers';
import { getChatCompletion } from '@src/api/api';
import { checkStorageQuota } from '@utils/storage';
import { useRef, useEffect, useState, useCallback } from 'react';
import { getEnvVar } from '@utils/env';

interface AnthropicResponse {
  message: {
    content: string;
  };
}

interface ContentResponse {
  content: string;
}

interface TextResponse {
  type: 'text';
  text: string;
}

export class ChatStreamHandler {
  constructor(
    private readonly decoder = new TextDecoder(),
    private readonly provider: typeof providers[keyof typeof providers]
  ) {}

  async processStream(
    reader: ReadableStreamDefaultReader<Uint8Array>,
    onContent: (content: string) => void,
    signal: AbortSignal
  ): Promise<void> {
    try {
      while (true) {
        if (signal.aborted) {
          throw new Error('Stream aborted');
        }

        const { done, value } = await reader.read();
        
        if (done) {
          console.log('Stream complete');
          break;
        }

        const chunk = this.decoder.decode(value);
        await this.processChunk(chunk, onContent);
      }
    } catch (error) {
      if (error.message === 'Stream aborted') {
        console.log('Stream processing aborted');
      } else {
        throw error;
      }
    }
  }

  private async processChunk(chunk: string, onContent: (content: string) => void): Promise<void> {
    const lines = chunk.split('\n').filter(line => line.trim() !== '');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') continue;

        try {
          const result = JSON.parse(data);
          const content = this.provider.parseStreamingResponse(result);
          if (content) onContent(content);
        } catch (e) {
          console.error('Failed to parse chunk:', e);
        }
      }
    }
  }
}

export class TitleGenerator {
  constructor(
    private readonly generateTitle: (messages: MessageInterface[], config: ModelConfig) => Promise<string | ContentResponse | AnthropicResponse | TextResponse | TextResponse[]>,
    private readonly language: string,
    private readonly defaultConfig: ModelConfig
  ) {
    if (!defaultConfig || !defaultConfig.model) {
      throw new Error('Invalid model configuration');
    }
  }

  async generateChatTitle(
    userMessage: string,
    assistantMessage: string
  ): Promise<string> {
    if (!this.defaultConfig || !this.defaultConfig.model) {
      throw new Error('Invalid model configuration');
    }

    const message: MessageInterface = {
      role: 'user',
      content: `Generate a title in less than 6 words for the following message (language: ${this.language}):\n"""\nUser: ${userMessage}\nAssistant: ${assistantMessage}\n"""`,
    };

    try {
      const response = await this.generateTitle([message], this.defaultConfig);

      if (Array.isArray(response)) {
        if (response.length > 0 && 'type' in response[0] && response[0].type === 'text') {
          const title = response[0].text.trim();
          return title.startsWith('"') && title.endsWith('"') ? title.slice(1, -1).trim() : title;
        }
      }

      if (typeof response === 'string') {
        const title = response.trim();
        return title.startsWith('"') && title.endsWith('"') ? title.slice(1, -1).trim() : title;
      }

      if (response && typeof response === 'object') {
        if ('type' in response && response.type === 'text' && 'text' in response) {
          const title = response.text.trim();
          return title.startsWith('"') && title.endsWith('"') ? title.slice(1, -1).trim() : title;
        }

        if ('content' in response) {
          const title = response.content.trim();
          return title.startsWith('"') && title.endsWith('"') ? title.slice(1, -1).trim() : title;
        }

        if ('message' in response && typeof response.message === 'object' && 'content' in response.message) {
          const title = (response as AnthropicResponse).message.content.trim();
          return title.startsWith('"') && title.endsWith('"') ? title.slice(1, -1).trim() : title;
        }
      }

      console.error('Unexpected response format:', response);
      throw new Error('Invalid response format from title generation');
    } catch (error) {
      console.error('Title generation error:', error);
      throw error;
    }
  }
}

const useSubmit = () => {
  const { i18n } = useTranslation('api');
  const store = useStore();
  const simMode = getEnvVar('VITE_SIM_MODE', 'false');
  const abortControllerRef = useRef<AbortController | null>(null);
  
  const {
    currentChatIndex,
    chats,
    apiKeys,
    error,
    setError,
    setGenerating,
    generating,
    setChats,
  } = store;

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

  const currentChat = chats?.[currentChatIndex];
  const providerKey = currentChat?.config.provider || DEFAULT_PROVIDER;
  const provider = providers[providerKey];
  const currentApiKey = apiKeys[providerKey];

  const streamHandler = new ChatStreamHandler(new TextDecoder(), provider);
  const titleGenerator = new TitleGenerator(
    async (messages, config) => {
      if (!config || !config.model) {
        throw new Error('Invalid model configuration');
      }

      const formattedRequest = provider.formatRequest(messages, {
        ...config,
        stream: false
      });

      const { messages: formattedMessages, ...configWithoutMessages } = formattedRequest;

      return getChatCompletion(
        providerKey,
        formattedMessages,
        configWithoutMessages,
        currentApiKey
      );
    },
    i18n.language,
    currentChat?.config.modelConfig || DEFAULT_MODEL_CONFIG
  );

  const stopGeneration = useCallback(() => {
    console.log('Stopping generation');
    setGenerating(false);
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  const simulateStreamResponse = async (
    onContent: (content: string) => void
  ): Promise<void> => {
    const testMessage = "This is a simulated response. It will stream word by word to test the UI rendering.";
    const words = testMessage.split(' ');
    
    abortControllerRef.current = new AbortController();
    
    try {
      for (const word of words) {
        if (abortControllerRef.current?.signal.aborted) {
          console.log('Simulation aborted');
          return;
        }

        onContent(word + ' ');
        await new Promise((resolve, reject) => {
          const timeoutId = setTimeout(resolve, 200);
          
          abortControllerRef.current?.signal.addEventListener('abort', () => {
            clearTimeout(timeoutId);
            reject(new Error('Aborted'));
          });
        });
      }
    } catch (error) {
      if (error.message === 'Aborted') {
        console.log('Simulation stopped');
      } else {
        throw error;
      }
    } finally {
      abortControllerRef.current = null;
    }
  };

  const handleSubmit = async () => {
    if (generating || !chats) {
      return;
    }

    abortControllerRef.current = new AbortController();
    setGenerating(true);
    setError(null);

    try {
      await checkStorageQuota();

      const updatedChats: ChatInterface[] = JSON.parse(JSON.stringify(chats));
      const currentMessages = updatedChats[currentChatIndex].messages;

      currentMessages.push({
        role: 'assistant',
        content: '',
      });

      setChats(updatedChats);

      if (simMode === 'true') {
        try {
          await simulateStreamResponse((content) => {
            const latestState = useStore.getState();
            const updatedChats = JSON.parse(JSON.stringify(latestState.chats));
            
            if (!updatedChats || latestState.currentChatIndex < 0) return;
            
            const updatedMessages = updatedChats[latestState.currentChatIndex].messages;
            const lastMessage = updatedMessages[updatedMessages.length - 1];
            
            if (lastMessage && lastMessage.role === 'assistant') {
              lastMessage.content += content;
              setChats(updatedChats);
            }
          });
        } finally {
          setGenerating(false);
        }
        return;
      }

      const { modelConfig } = updatedChats[currentChatIndex].config;

      const formattedRequest = provider.formatRequest(currentMessages, {
        ...modelConfig,
        stream: true
      });

      const { messages: formattedMessages, ...configWithoutMessages } = formattedRequest;

      const response = await fetch(`/api/chat/${providerKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify({
          messages: formattedMessages,
          config: configWithoutMessages,
          apiKey: currentApiKey,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body is null');
      }

      await streamHandler.processStream(
        reader,
        (content) => {
          const updatedChats: ChatInterface[] = JSON.parse(
            JSON.stringify(useStore.getState().chats)
          );
          const updatedMessages = updatedChats[currentChatIndex].messages;
          updatedMessages[updatedMessages.length - 1].content += content;
          setChats(updatedChats);
        },
        abortControllerRef.current.signal
      );

      const messages = updatedChats[currentChatIndex].messages;
      const lastUserMessage = messages[messages.length - 2]?.content || '';
      const lastAssistantMessage = messages[messages.length - 1]?.content || '';

      if (!currentChat.title && lastUserMessage && lastAssistantMessage) {
        try {
          const title = await titleGenerator.generateChatTitle(
            lastUserMessage,
            lastAssistantMessage
          );
          
          const updatedChats = JSON.parse(JSON.stringify(useStore.getState().chats));
          updatedChats[currentChatIndex].title = title;
          setChats(updatedChats);
        } catch (error) {
          console.error('Failed to generate title:', error);
        }
      }
    } catch (error) {
      console.error('Submission error:', error);
      setError(error.message || 'An error occurred during submission');
    } finally {
      setGenerating(false);
      abortControllerRef.current = null;
    }
  };

  const regenerateMessage = async () => {
    if (generating || !chats) {
      return;
    }

    const updatedChats: ChatInterface[] = JSON.parse(JSON.stringify(chats));
    const currentMessages = updatedChats[currentChatIndex].messages;
    if (currentMessages[currentMessages.length - 1]?.role === 'assistant') {
      currentMessages.pop();
    }

    setChats(updatedChats);
    await handleSubmit();
  };

  return { handleSubmit, stopGeneration, regenerateMessage, error, generating };
};

export default useSubmit;
