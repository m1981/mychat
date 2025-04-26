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

class SubmissionLock {
  private locked = false;
  
  isLocked(): boolean {
    return this.locked;
  }
  
  async acquire(): Promise<boolean> {
    if (this.locked) return false;
    this.locked = true;
    return true;
  }
  
  release(): void {
    this.locked = false;
  }
}

class ResponseCache {
  private cache = new Map<string, Promise<Response>>();
  
  async getOrCreate(
    key: string,
    factory: () => Promise<Response>
  ): Promise<Response> {
    if (!this.cache.has(key)) {
      this.cache.set(key, factory());
    }
    return this.cache.get(key)!;
  }
  
  clear(): void {
    this.cache.clear();
  }
}

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
  private aborted = false;

  constructor(
    private readonly decoder = new TextDecoder(),
    private readonly provider: typeof providers[keyof typeof providers]
  ) {
    console.log('🔧 ChatStreamHandler initialized with provider:', provider.id);
  }

  async processStream(
    reader: ReadableStreamDefaultReader<Uint8Array>,
    onContent: (content: string) => void,
    signal?: AbortSignal
  ): Promise<void> {
    console.log('📡 Starting stream processing');
    
    if (signal) {
      signal.addEventListener('abort', () => {
        console.log('🛑 Abort signal received');
        this.aborted = true;
        reader.cancel().catch(console.error);
      }, { once: true });
    }

    try {
      while (!this.aborted) {
        const { done, value } = await reader.read();
        
        if (done) {
          console.log('🏁 Stream ended. Done:', done, 'Aborted:', this.aborted);
          break;
        }

        const chunk = this.decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim() !== '');

        for (const line of lines) {
          if (this.aborted) break;
          
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              console.log('✅ Received [DONE] signal');
              continue;
            }

            try {
              const result = JSON.parse(data);
              const content = this.provider.parseStreamingResponse(result);
              if (content) {
                onContent(content);
              }
            } catch (e) {
              console.error('❌ Failed to parse chunk:', e);
            }
          }
        }
      }
    } finally {
      console.log('🧹 Cleaning up stream resources');
      try {
        await reader.cancel();
        console.log('✅ Reader cancelled successfully');
      } catch (e) {
        console.error('❌ Error cancelling reader:', e);
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

interface SubmissionService {
  submit(messages: MessageInterface[], config: ModelConfig): Promise<void>;
  abort(): void;
}

class ChatSubmissionService implements SubmissionService {
  constructor(
    private provider: typeof providers[keyof typeof providers],
    private apiKey: string,
    private onContent: (content: string) => void,
    private streamHandler: ChatStreamHandler
  ) {}

  async submit(messages: MessageInterface[], config: ModelConfig): Promise<void> {
    const formattedRequest = this.provider.formatRequest(messages, {
      ...config,
      stream: true
    });

    const response = await fetch(`/api/chat/${this.provider.id}`, {  // Changed from key to id
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
      },
      body: JSON.stringify({
        messages: formattedRequest.messages,
        config: formattedRequest,
        apiKey: this.apiKey,
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('Response body is null');

    await this.streamHandler.processStream(reader, this.onContent);
  }

  abort(): void {
    // Implement abort logic
  }
}

const useSubmit = () => {
  const { i18n } = useTranslation('api');
  const store = useStore();
  const abortControllerRef = useRef<AbortController | null>(null);
  const submissionLock = useRef(new SubmissionLock());
  const cache = useRef(new ResponseCache());
  
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

  // Move streamHandler initialization outside useEffect
  const streamHandlerRef = useRef<ChatStreamHandler>(
    new ChatStreamHandler(new TextDecoder(), provider)
  );

  // Update streamHandler when provider changes
  useEffect(() => {
    streamHandlerRef.current = new ChatStreamHandler(new TextDecoder(), provider);
    
    return () => {
      console.log('🧹 Cleaning up resources');
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, [provider]);

  const titleGenerator = new TitleGenerator(
    async (messages, config) => {
      if (!config || !config.model) {
        throw new Error('Invalid model configuration');
      }

      // Get the current provider and its default model
      const currentProvider = providers[providerKey];
      const modelConfig: ModelConfig = {
        ...config,
        model: currentProvider.models[0], // Use the first available model for the provider
      };

      const formattedRequest = currentProvider.formatRequest(messages, {
        ...modelConfig,
        stream: false // Add stream property here in the request formatting
      });

      const { messages: formattedMessages, ...configWithoutMessages } = formattedRequest;

      // Create a complete ModelConfig object with all required properties
      const response = await getChatCompletion(
        providerKey,
        formattedMessages,
        modelConfig,
        currentApiKey
      );

      return response;
    },
    i18n.language,
    {
      ...DEFAULT_MODEL_CONFIG,
      model: provider.models[0], // Use the first available model for the provider
    }
  );

  const stopGeneration = useCallback(() => {
    console.log('🛑 Stop generation requested');
    setGenerating(false);
    
    if (abortControllerRef.current) {
      console.log('⚡ Aborting current request');
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, [setGenerating]);

  const simulateStreamResponse = async (
    onContent: (content: string) => void
  ): Promise<void> => {
    const testMessage = "This is a simulated response. It will stream word by word to test the UI rendering.";
    const words = testMessage.split(' ');
    
    try {
      for (const word of words) {
        // Check if generation should stop
        if (!useStore.getState().generating) {
          console.log('🛑 Simulation stopped - generating flag is false');
          return;
        }

        if (abortControllerRef.current?.signal.aborted) {
          console.log('🛑 Simulation stopped - abort signal received');
          return;
        }

        onContent(word + ' ');
        await new Promise((resolve, reject) => {
          const timeoutId = setTimeout(resolve, 200);
          
          // Clean up timeout if aborted
          abortControllerRef.current?.signal.addEventListener('abort', () => {
            clearTimeout(timeoutId);
            reject(new Error('Aborted'));
          }, { once: true });
        });
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.message === 'Aborted') {
        console.log('🛑 Simulation aborted cleanly');
      } else {
        console.error('❌ Simulation error:', error);
        throw error;
      }
    }
  };

  // Pure function to prepare chat update
  function prepareChatUpdate(chats: ChatInterface[], currentIndex: number): ChatInterface[] {
    const updatedChats = JSON.parse(JSON.stringify(chats));
    const currentMessages = updatedChats[currentIndex].messages;
    
    currentMessages.push({
      role: 'assistant',
      content: '',
    });
    
    return updatedChats;
  }

  // Pure function to update message content
  function updateMessageContent(
    chats: ChatInterface[],
    currentIndex: number,
    content: string
  ): ChatInterface[] {
    const updatedChats = JSON.parse(JSON.stringify(chats));
    const messages = updatedChats[currentIndex].messages;
    const lastMessage = messages[messages.length - 1];
    
    if (lastMessage?.role === 'assistant') {
      lastMessage.content += content;
    }
    
    return updatedChats;
  }

  const handleSubmit = async () => {
    console.log('🚀 Starting submission');
    
    const currentState = useStore.getState();
    if (currentState.generating || !currentState.chats) {
      console.log('⚠️ Submission blocked - already generating or no chats');
      return;
    }

    // Add validation for streamHandler
    if (!streamHandlerRef.current) {
      console.error('❌ StreamHandler not initialized');
      return;
    }

    setGenerating(true);
    setError(null);
    abortControllerRef.current = new AbortController();

    try {
      await checkStorageQuota();
      
      const updatedChats: ChatInterface[] = JSON.parse(JSON.stringify(currentState.chats));
      const currentMessages = updatedChats[currentState.currentChatIndex].messages;

      // Add empty assistant message
      currentMessages.push({
        role: 'assistant',
        content: '',
      });
      setChats(updatedChats);

      const { modelConfig } = updatedChats[currentState.currentChatIndex].config;
      
      console.log('📤 Preparing request for provider:', providerKey);
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
      if (!reader) throw new Error('Response body is null');

      console.log('📡 Starting stream processing');
      await streamHandlerRef.current?.processStream(
        reader,
        (content) => {
          const latestState = useStore.getState();
          if (!latestState.chats) return;
          
          const updatedChats = JSON.parse(JSON.stringify(latestState.chats));
          const messages = updatedChats[currentState.currentChatIndex].messages;
          const lastMessage = messages[messages.length - 1];
          
          if (lastMessage?.role === 'assistant') {
            lastMessage.content += content;
            setChats(updatedChats);
          }
        },
        abortControllerRef.current.signal
      );

      await handleTitleGeneration();
    } catch (error) {
      console.error('❌ Submit error:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      setError(errorMessage);
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
      const updatedChats = [...currentState.chats];
      updatedChats[currentState.currentChatIndex] = {
        ...updatedChats[currentState.currentChatIndex],
        title,
        titleSet: true
      };
      setChats(updatedChats);
    } catch (error) {
      console.error('Title generation failed:', {
        error,
        state: useStore.getState()
      });
      // Re-throw the error as it was in the original implementation
      throw error;
    }
  };

  return { handleSubmit, stopGeneration, regenerateMessage, error, generating };
};

export default useSubmit;
