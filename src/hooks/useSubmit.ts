import { useTranslation } from 'react-i18next';
import { DEFAULT_PROVIDER } from '@config/chat/ChatConfig';
import { DEFAULT_MODEL_CONFIG } from '@config/chat/ModelConfig';
import useStore from '@store/store';
import { ChatInterface, MessageInterface, ModelConfig } from '@type/chat';
import { providers } from '@type/providers';
import { getChatCompletion } from '@src/api/api';
import { checkStorageQuota } from '@utils/storage';

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
  constructor(
    private readonly decoder = new TextDecoder(),
    private readonly provider: typeof providers[keyof typeof providers]
  ) {}

  async processStream(
    reader: ReadableStreamDefaultReader<Uint8Array>,
    onContent: (content: string) => void
  ): Promise<void> {
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        console.log('Stream complete');
        break;
      }

      const chunk = this.decoder.decode(value);
      await this.processChunk(chunk, onContent);
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

  const handleSubmit = async () => {
    const currentState = useStore.getState();
    
    if (currentState.generating || !currentState.chats) {
      return;
    }

    setGenerating(true);
    setError(null);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      await checkStorageQuota();

      const updatedChats: ChatInterface[] = JSON.parse(JSON.stringify(currentState.chats));
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
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body is null');
      }

      await streamHandler.processStream(reader, (content) => {
        const updatedChats: ChatInterface[] = JSON.parse(
          JSON.stringify(useStore.getState().chats)
        );
        const updatedMessages = updatedChats[currentChatIndex].messages;
        updatedMessages[updatedMessages.length - 1].content += content;
        setChats(updatedChats);
      });

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
      setGenerating(false);
    }
  };

  return { handleSubmit, error };
};

export default useSubmit;
