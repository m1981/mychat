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
    console.log('🔧 ChatStreamHandler initialized');
  }

  async processStream(
    reader: ReadableStreamDefaultReader<Uint8Array>,
    onContent: (content: string) => void,
    signal?: AbortSignal
  ): Promise<void> {
    console.log('📡 Starting stream processing');
    
    if (signal) {
      signal.addEventListener('abort', () => {
        console.log('🛑 Abort signal received in ChatStreamHandler');
        this.aborted = true;
        reader.cancel().catch(e => console.error('❌ Reader cancel error:', e));
      }, { once: true });
    }

    try {
      while (!this.aborted) {
        const { done, value } = await reader.read();
        
        if (done || this.aborted) {
          console.log(`🏁 Stream ended. Done: ${done}, Aborted: ${this.aborted}`);
          break;
        }

        const chunk = this.decoder.decode(value);
        await this.processChunk(chunk, onContent);
      }
    } catch (error) {
      console.error('❌ Stream processing error:', error);
      throw error;
    } finally {
      console.log('🧹 Cleaning up stream resources');
      this.aborted = false;
      try {
        await reader.cancel();
        console.log('✅ Reader cancelled successfully');
      } catch (e) {
        console.error('❌ Reader cleanup error:', e);
      }
    }
  }

  private async processChunk(chunk: string, onContent: (content: string) => void): Promise<void> {
    if (this.aborted) {
      console.log('🚫 Chunk processing skipped - stream aborted');
      return;
    }

    const lines = chunk.split('\n').filter(line => line.trim() !== '');
    console.log(`📦 Processing ${lines.length} lines from chunk`);

    for (const line of lines) {
      if (this.aborted) {
        console.log('🚫 Line processing interrupted - stream aborted');
        break;
      }
      
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') {
          console.log('✅ Received [DONE] signal');
          continue;
        }

        try {
          const result = JSON.parse(data);
          const content = this.provider.parseStreamingResponse(result);
          if (content) onContent(content);
        } catch (e) {
          console.error('❌ Chunk parsing error:', e);
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
  const streamHandlerRef = useRef<ChatStreamHandler | null>(null);
  const submissionLock = useRef(new SubmissionLock());
  const cache = useRef(new ResponseCache());
  
  // Add simMode initialization at the top with other variables
  const simMode = getEnvVar('VITE_SIM_MODE', 'false');
  
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

  // Initialize streamHandler once with provider
  useEffect(() => {
    if (!streamHandlerRef.current) {
      console.log('🔧 Initializing ChatStreamHandler (once)');
      streamHandlerRef.current = new ChatStreamHandler(new TextDecoder(), provider);
    }
    
    return () => {
      console.log('🧹 Cleaning up resources');
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, [provider]); // Add provider as dependency

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

      // Extract base config from the formatted request
      const baseConfig = configWithoutMessages as Partial<ModelConfig>;

      // Create a complete ModelConfig object with all required properties
      const fullConfig: ModelConfig = {
        model: baseConfig.model || DEFAULT_MODEL_CONFIG.model,
        max_tokens: baseConfig.max_tokens || DEFAULT_MODEL_CONFIG.max_tokens,
        temperature: baseConfig.temperature || DEFAULT_MODEL_CONFIG.temperature,
        presence_penalty: baseConfig.presence_penalty || DEFAULT_MODEL_CONFIG.presence_penalty,
        top_p: baseConfig.top_p || DEFAULT_MODEL_CONFIG.top_p,
        frequency_penalty: baseConfig.frequency_penalty || DEFAULT_MODEL_CONFIG.frequency_penalty,
        enableThinking: false,
        thinkingConfig: {
          budget_tokens: 0
        }
      };

      return getChatCompletion(
        providerKey,
        formattedMessages,
        fullConfig,
        currentApiKey
      );
    },
    i18n.language,
    currentChat?.config.modelConfig || DEFAULT_MODEL_CONFIG
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
    console.log('🚀 Starting submission', { simMode, generating });
    
    if (generating || !chats || !currentChat) {  // Add currentChat check
      console.log('⚠️ Submission blocked - already generating, no chats, or no current chat');
      return;
    }

    abortControllerRef.current = new AbortController();
    setGenerating(true);
    setError(null);

    try {
      await checkStorageQuota();
      console.log('✅ Storage quota check passed');

      const updatedChats = prepareChatUpdate(chats, currentChatIndex);
      setChats(updatedChats);

      // Get current messages after chat update
      const currentMessages = updatedChats[currentChatIndex].messages;

      if (simMode === 'true') {
        console.log('🎮 Starting simulation mode');
        try {
          await simulateStreamResponse((content) => {
            if (!useStore.getState().generating) return;
            const latestState = useStore.getState();
            if (!latestState.chats) return;
            
            const updatedChats = updateMessageContent(
              latestState.chats,
              latestState.currentChatIndex,
              content
            );
            if (!updatedChats || latestState.currentChatIndex < 0) return;
            setChats(updatedChats);
          });
        } catch (error) {
          console.error('❌ Simulation error:', error);
          throw error;
        } finally {
          console.log('✨ Simulation complete');
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

      console.log('📡 Starting stream processing');
      await streamHandlerRef.current?.processStream(
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

      // Add null check for currentChat
      if (currentChat && !currentChat.title && lastUserMessage && lastAssistantMessage) {
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
      console.error('❌ Submit error:', error);
      // Handle the unknown error type
      const errorMessage = error instanceof Error ? error.message : 'An error occurred during submission';
      setError(errorMessage);
    } finally {
      console.log('✨ Submission complete');
      setGenerating(false);
      submissionLock.current.release();
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
