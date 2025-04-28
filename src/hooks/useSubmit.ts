import { useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { DEFAULT_PROVIDER } from '@config/chat/ChatConfig';
import { DEFAULT_MODEL_CONFIG } from '@config/chat/ModelConfig';
import useStore from '@store/store';
import { ChatInterface, MessageInterface, ModelConfig } from '@type/chat';
import { providers } from '@type/providers';
import { checkStorageQuota } from '@utils/storage';
import { ChatApiService } from '@src/services/ChatApiService';
import { ResponseHandlerService } from '@src/services/ResponseHandlerService';
import { SubmissionContext } from '@src/submission/SubmissionContext';
import { SubmissionStrategy } from '@type/submission';
import { NewMessageStrategy } from '@src/submission/NewMessageStrategy';

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

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
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
    private readonly generateTitle: (
      messages: MessageInterface[],
      config: ModelConfig
    ) => Promise<string | ContentResponse | AnthropicResponse | TextResponse | TextResponse[] | OpenAIResponse>,
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
      console.log('Title generation raw response:', response);

      // Handle array response
      if (Array.isArray(response)) {
        if (response.length === 0) {
          throw new Error('Invalid response format from title generation');
        }
        const firstResponse = response[0];
        if ('type' in firstResponse && firstResponse.type === 'text' && 'text' in firstResponse) {
          const title = firstResponse.text.trim();
          return title.startsWith('"') && title.endsWith('"') ? title.slice(1, -1).trim() : title;
        }
      }

      // Handle OpenAI response format
      if (response && typeof response === 'object') {
        if ('choices' in response && Array.isArray(response.choices) && response.choices.length > 0) {
          const content = response.choices[0]?.message?.content;
          if (content) {
            const title = content.trim();
            return title.startsWith('"') && title.endsWith('"') ? title.slice(1, -1).trim() : title;
          }
        }

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

      // Handle string response
      if (typeof response === 'string') {
        const title = response.trim();
        return title.startsWith('"') && title.endsWith('"') ? title.slice(1, -1).trim() : title;
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
  const { i18n } = useTranslation();
  const {
    chats,
    currentChatIndex,
    generating,
    setChats,
    setGenerating,
    error,
    setError,
    apiKeys,
    currentChat
  } = useStore();

  const submissionContext = useRef<SubmissionContext | null>(null);

  // Add debug logging for dependencies
  useEffect(() => {
    console.log('Debug - Dependencies:', {
      currentChat,
      provider: currentChat?.config?.provider,
      apiKeys,
      currentChatIndex
    });
  }, [currentChat, apiKeys, currentChatIndex]);

  // Get the current provider from the chat configuration
  const currentProvider = currentChat?.config?.provider 
    ? providers[currentChat.config.provider]
    : providers[DEFAULT_PROVIDER];

  const currentApiKey = currentChat?.config?.provider 
    ? apiKeys[currentChat.config.provider]
    : apiKeys[DEFAULT_PROVIDER];

  const isSimulationMode = !currentApiKey; // Add this flag

  // Add debug logging for provider and API key
  useEffect(() => {
    console.log('Debug - Provider and API Key:', {
      providerId: currentProvider?.id,
      hasApiKey: !!currentApiKey
    });
  }, [currentProvider, currentApiKey]);

  useEffect(() => {
    console.log('Attempting to initialize submission context...');
    
    if (!currentProvider) {
      console.error('No provider available. Current provider:', currentProvider);
      return;
    }

    if (!currentApiKey) {
      console.error('No API key available for provider:', currentProvider.id);
      return;
    }

    console.log('Initializing submission context with provider:', currentProvider.id);
    
    try {
      const apiService = new ChatApiService(currentProvider, currentApiKey);
      const streamHandler = new ChatStreamHandler(new TextDecoder(), currentProvider);
      const responseHandler = new ResponseHandlerService(streamHandler, setChats);

      submissionContext.current = new SubmissionContext(
        apiService,
        responseHandler,
        new AbortController()
      );

      console.log('Submission context initialized successfully');
    } catch (error) {
      console.error('Failed to initialize submission context:', error);
    }

    return () => {
      console.log('Cleaning up submission context');
      submissionContext.current?.abort();
      submissionContext.current = null;
    };
  }, [currentChat?.config?.provider, apiKeys, setChats, currentProvider, currentApiKey]);

  const titleGenerator = new TitleGenerator(
    async (messages, config) => {
      if (!config || !config.model || !currentProvider || !currentApiKey) {
        throw new Error('Invalid configuration for title generation');
      }

      const modelConfig: ModelConfig = {
        ...config,
        model: config.model
      };

      const requestConfig = {
        ...modelConfig,
        stream: false
      };

      const formattedRequest = currentProvider.formatRequest(messages, requestConfig);
      const { messages: formattedMessages, ...configWithoutMessages } = formattedRequest;

      try {
        const response = await getChatCompletion(
          currentProvider.id,
          formattedMessages,
          modelConfig,
          currentApiKey
        );

        if (!response) {
          throw new Error('No response received from title generation');
        }

        return response;
      } catch (error) {
        console.error('Error in title generation:', error);
        throw error;
      }
    },
    i18n.language,
    {
      ...DEFAULT_MODEL_CONFIG,
      model: currentProvider?.models[0] ?? DEFAULT_MODEL_CONFIG.model
    }
  );

  const stopGeneration = useCallback(() => {
    console.log('🛑 Stop generation requested');
    setGenerating(false);
    submissionContext.current?.abort();
  }, [setGenerating]);

  const regenerateMessage = useCallback(async () => {
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
  }, [generating, chats, currentChatIndex, setChats]);

  const simulateStreamResponse = async (
    onContent: (content: string) => void
  ): Promise<void> => {
    const testMessage = "This is a simulated response. It will stream word by word to test the UI rendering.";
    const words = testMessage.split(' ');
    
    try {
      for (const word of words) {
        if (!useStore.getState().generating) {
          console.log('🛑 Simulation stopped - generating flag is false');
          return;
        }

        onContent(word + ' ');
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    } catch (error) {
      console.error('❌ Simulation error:', error);
      throw error;
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

  const handleSubmit = useCallback(async (content: string) => {
    console.log('handleSubmit called with content:', content, {
      isSimulationMode,
      hasCurrentChat: !!currentChat,
      currentProvider: currentProvider?.id,
    });
    
    if (!content) {
      console.error('Content is undefined or empty');
      return;
    }

    setGenerating(true);
    setError(null);

    try {
      if (isSimulationMode) {
        console.log('Running in simulation mode');
        const updateStore = (content: string) => {
          const updatedChats = [...chats];
          if (!updatedChats[currentChatIndex]) {
            updatedChats[currentChatIndex] = {
              messages: [],
              config: {
                provider: DEFAULT_PROVIDER,
                modelConfig: DEFAULT_MODEL_CONFIG
              }
            };
          }
          
          // Add user message
          updatedChats[currentChatIndex].messages.push({
            role: 'user',
            content: content
          });
          
          // Add empty assistant message that will be updated
          updatedChats[currentChatIndex].messages.push({
            role: 'assistant',
            content: ''
          });
          
          setChats(updatedChats);
        };

        // Update store with user message
        updateStore(content);

        // Simulate response
        await simulateStreamResponse((chunk) => {
          const updatedChats = [...chats];
          const messages = updatedChats[currentChatIndex].messages;
          const lastMessage = messages[messages.length - 1];
          if (lastMessage && lastMessage.role === 'assistant') {
            lastMessage.content += chunk;
            setChats(updatedChats);
          }
        });
      } else {
        // Original submission logic for non-simulation mode
        if (!submissionContext.current || !currentChat) {
          throw new Error('Submission context or current chat not available');
        }

        await checkStorageQuota();
        
        const updateStore = (messages: MessageInterface[]) => {
          const updatedChats = [...chats];
          updatedChats[currentChatIndex] = {
            ...updatedChats[currentChatIndex],
            messages: [...messages]
          };
          setChats(updatedChats);
        };

        const strategy = new NewMessageStrategy(
          content,
          'user',
          updateStore
        );

        await submissionContext.current.submit(
          strategy,
          currentChat.config.modelConfig,
          currentChatIndex
        );
      }
    } catch (error) {
      console.error('Submission error:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setGenerating(false);
    }
  }, [
    chats, 
    currentChatIndex, 
    currentChat, 
    setChats, 
    setGenerating, 
    setError, 
    isSimulationMode, 
    simulateStreamResponse
  ]);

  const handleTitleGeneration = async () => {
    if (!currentChat || !chats || chats.length === 0) return;

    const messages = currentChat.messages;
    if (messages.length < 2) return;

    const lastUserMessage = messages[messages.length - 2].content;
    const lastAssistantMessage = messages[messages.length - 1].content;

    try {
      const title = await titleGenerator.generateChatTitle(lastUserMessage, lastAssistantMessage);
      
      const updatedChats = [...chats];
      updatedChats[currentChatIndex] = {
        ...updatedChats[currentChatIndex],
        title,
        titleSet: true
      };
      setChats(updatedChats);
    } catch (error) {
      console.error('Title generation failed:', error);
      throw error;
    }
  };

  return {
    handleSubmit,
    stopGeneration,
    regenerateMessage,
    error,
    generating,
    simulateStreamResponse,
    prepareChatUpdate,
    updateMessageContent,
    isSimulationMode // Add this to the return object
  };
};

export default useSubmit;
