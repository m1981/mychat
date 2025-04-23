import { useTranslation } from 'react-i18next';
import { DEFAULT_PROVIDER } from '@config/chat/ChatConfig';
import { DEFAULT_MODEL_CONFIG } from '@config/chat/ModelConfig';
import useStore from '@store/store';
import { ChatInterface, MessageInterface, ModelConfig } from '@type/chat';
import { providers } from '@type/providers';
import { getChatCompletion } from '@src/api/api';
import { checkStorageQuota } from '@utils/storage';
import { useRef, useEffect } from 'react';

// Add these interfaces at the top of the file
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

// Extracted for testing
export class ChatStreamHandler {
  private buffer: string = '';
  private readonly chunkSize = 32 * 1024; // 32KB chunks

  constructor(
    private readonly decoder = new TextDecoder(),
    private readonly provider: typeof providers[keyof typeof providers]
  ) {}

  async processStream(
    reader: ReadableStreamDefaultReader<Uint8Array>,
    onContent: (content: string) => void
  ): Promise<void> {
    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          // Process any remaining buffer
          if (this.buffer) {
            await this.processBuffer(this.buffer, onContent);
          }
          console.log('Stream complete');
          break;
        }

        // Decode chunk and add to buffer
        this.buffer += this.decoder.decode(value, { stream: true });
        
        // Process complete lines from buffer
        if (this.buffer.length > this.chunkSize) {
          const lastNewlineIndex = this.buffer.lastIndexOf('\n');
          if (lastNewlineIndex > 0) {
            const completeLines = this.buffer.slice(0, lastNewlineIndex);
            this.buffer = this.buffer.slice(lastNewlineIndex + 1);
            await this.processBuffer(completeLines, onContent);
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  private async processBuffer(buffer: string, onContent: (content: string) => void): Promise<void> {
    // Process lines in chunks to avoid blocking the main thread
    const lines = buffer.split('\n');
    const chunks = this.chunkArray(lines, 50); // Process 50 lines at a time

    for (const chunk of chunks) {
      await new Promise(resolve => setTimeout(resolve, 0)); // Yield to main thread
      
      for (const line of chunk) {
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

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}

// Extracted for testing
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

      // First, handle array response
      if (Array.isArray(response)) {
        if (response.length > 0 && 'type' in response[0] && response[0].type === 'text') {
          const title = response[0].text.trim();
          return title.startsWith('"') && title.endsWith('"') ? title.slice(1, -1).trim() : title;
        }
      }

      // Handle single response cases
      if (typeof response === 'string') {
        const title = response.trim();
        return title.startsWith('"') && title.endsWith('"') ? title.slice(1, -1).trim() : title;
      }

      if (response && typeof response === 'object') {
        // Handle single TextResponse
        if ('type' in response && response.type === 'text' && 'text' in response) {
          const title = response.text.trim();
          return title.startsWith('"') && title.endsWith('"') ? title.slice(1, -1).trim() : title;
        }

        // Handle Anthropic's response format
        if ('content' in response) {
          const title = response.content.trim();
          return title.startsWith('"') && title.endsWith('"') ? title.slice(1, -1).trim() : title;
        }

        // Handle nested content structures
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

// Main hook with dependencies injected for testing
const useSubmit = () => {
  const { i18n } = useTranslation('api');
  const store = useStore();
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

  const currentChat = chats?.[currentChatIndex];
  const providerKey = currentChat?.config.provider || DEFAULT_PROVIDER;
  const provider = providers[providerKey];
  const currentApiKey = apiKeys[providerKey];

  // Add AbortController as a ref to persist between renders
  const abortControllerRef = useRef<AbortController | null>(null);

  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setGenerating(false);
    }
  };

  // Extracted for testing
  const streamHandler = new ChatStreamHandler(new TextDecoder(), provider);
  const titleGenerator = new TitleGenerator(
    async (messages, config) => {
      if (!config || !config.model) {
        throw new Error('Invalid model configuration');
      }

      // Format request based on provider
      const formattedRequest = provider.formatRequest(messages, {
        ...config,
        stream: false
      });

      // Separate messages from config
      const { messages: formattedMessages, ...configWithoutMessages } = formattedRequest;

      // Create a complete ModelConfig object
      const modelConfig: ModelConfig = {
        model: configWithoutMessages.model,
        max_tokens: configWithoutMessages.max_tokens ?? 2000,
        temperature: configWithoutMessages.temperature ?? 0.7,
        top_p: configWithoutMessages.top_p ?? 1,
        presence_penalty: configWithoutMessages.presence_penalty ?? 0,
        frequency_penalty: configWithoutMessages.frequency_penalty ?? 0,
        enableThinking: false,
        thinkingConfig: {
          budget_tokens: 1000
        }
      };

      return getChatCompletion(
        providerKey,
        formattedMessages,
        modelConfig,
        currentApiKey
      );
    },
    i18n.language,
    currentChat?.config.modelConfig || DEFAULT_MODEL_CONFIG
  );

  const handleTitleGeneration = async () => {
    console.log('Title generation config:', {
      providerKey,
      provider: providers[providerKey],
      modelConfig: currentChat?.config.modelConfig,
      defaultConfig: DEFAULT_MODEL_CONFIG
    });
    
    try {
      const currentState = useStore.getState();
      if (!currentState.chats || currentState.currentChatIndex < 0) {
        throw new Error('No active chat found');
      }

      const currentMessages = currentState.chats[currentState.currentChatIndex].messages;
      
      // Get the last user and assistant messages
      const lastUserMessage = currentMessages
        .slice()
        .reverse()
        .find(msg => msg.role === 'user')?.content || '';
      
      const lastAssistantMessage = currentMessages
        .slice()
        .reverse()
        .find(msg => msg.role === 'assistant')?.content || '';

      const title = await titleGenerator.generateChatTitle(lastUserMessage, lastAssistantMessage);
      console.log('Title generated:', title);

      // Update the chat title
      if (currentState.chats) {
        const updatedChats = [...currentState.chats];
        updatedChats[currentState.currentChatIndex].title = title;
        setChats(updatedChats);
      }
    } catch (error) {
      console.error('Title generation failed:', {
        error,
        state: useStore.getState()
      });
      throw error;
    }
  };

  const MAX_MESSAGE_SIZE = 1024 * 1024; // 1MB limit per message
  const MAX_TOTAL_MESSAGES = 100; // Limit total messages in chat

  const handleSubmit = async () => {
    const currentState = useStore.getState();
    
    if (!currentState.chats || currentState.currentChatIndex < 0) {
      setError('No active chat found');
      return;
    }

    const messageSize = new TextEncoder().encode(
      JSON.stringify(currentState.chats[currentChatIndex])
    ).length;
    
    if (messageSize > MAX_MESSAGE_SIZE) {
      setError(`Message size exceeds limit of ${MAX_MESSAGE_SIZE / 1024 / 1024}MB`);
      return;
    }

    if (currentState.chats[currentChatIndex].messages.length >= MAX_TOTAL_MESSAGES) {
      setError(`Maximum message limit of ${MAX_TOTAL_MESSAGES} reached`);
      return;
    }

    if (currentState.generating || !currentState.chats) {
      return;
    }

    setGenerating(true);
    setError(null);

    // Store the controller in ref for access from stopGeneration
    abortControllerRef.current = new AbortController();
    const timeout = setTimeout(() => abortControllerRef.current?.abort(), 30000);

    try {
      await checkStorageQuota();

      const updatedChats: ChatInterface[] = structuredClone(currentState.chats);
      const currentMessages = updatedChats[currentState.currentChatIndex].messages;

      currentMessages.push({
        role: 'assistant',
        content: '',
      });

      setChats(updatedChats);

      const { modelConfig } = updatedChats[currentChatIndex].config;
      
      const formattedRequest = provider.formatRequest(currentMessages, {
        ...modelConfig,
        stream: true
      });

      // Separate messages from config
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

      // Batch content updates
      const contentBuffer = useRef<string>('');
      const updateTimeout = useRef<NodeJS.Timeout>();
      
      const batchedContentUpdate = (content: string) => {
        contentBuffer.current += content;
        
        // Clear existing timeout
        if (updateTimeout.current) {
          clearTimeout(updateTimeout.current);
        }
        
        // Schedule state update
        updateTimeout.current = setTimeout(() => {
          const currentState = useStore.getState();
          if (!currentState.chats) return;

          const updatedChats = updateLastMessage(
            currentState.chats,
            currentChatIndex,
            contentBuffer.current
          );
          
          setChats(updatedChats);
          contentBuffer.current = '';
        }, 100); // Batch updates every 100ms
      };

      await streamHandler.processStream(reader, batchedContentUpdate);
      
      // Cleanup on unmount
      useEffect(() => {
        return () => {
          if (updateTimeout.current) {
            clearTimeout(updateTimeout.current);
          }
        };
      }, []);

      console.log('✨ Starting title generation');
      await handleTitleGeneration();
      console.log('🏷️ Title generation complete');

    } catch (error) {
      console.error('❌ Submit error:', error);
      // Only set error if it's a non-empty string
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      if (errorMessage) {
        setError(errorMessage);
      }
    } finally {
      clearTimeout(timeout);
      abortControllerRef.current = null;
      setGenerating(false);
    }
  };

  const regenerateMessage = async () => {
    const currentState = useStore.getState();
    
    if (currentState.generating || !currentState.chats) {
      return;
    }

    // Create a copy of chats
    const updatedChats: ChatInterface[] = structuredClone(currentState.chats);
    
    // Remove the last assistant message if it exists
    const currentMessages = updatedChats[currentState.currentChatIndex].messages;
    if (currentMessages[currentMessages.length - 1]?.role === 'assistant') {
      currentMessages.pop();
    }

    // Update the chats first
    setChats(updatedChats);

    // Then trigger a new submission
    await handleSubmit();
  };

  return { handleSubmit, stopGeneration, regenerateMessage, error };
};

const updateLastMessage = (chats: ChatInterface[], chatIndex: number, content: string): ChatInterface[] => {
  const chat = { ...chats[chatIndex] };
  const messages = [...chat.messages];
  messages[messages.length - 1] = {
    ...messages[messages.length - 1],
    content
  };
  chat.messages = messages;
  
  return [
    ...chats.slice(0, chatIndex),
    chat,
    ...chats.slice(chatIndex + 1)
  ];
};

export default useSubmit;
