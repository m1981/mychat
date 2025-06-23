import useStore from '@store/store';
import { MessageInterface } from '@type/chat';
import { AIProviderBase, ModelConfig, RequestConfig } from '@type/provider';
import { debug } from '@utils/debug';

export interface SubmissionService {
  submit(messages: MessageInterface[], config: RequestConfig): Promise<void>;
}

export interface StreamHandler {
  processStream(reader: ReadableStreamDefaultReader<Uint8Array>, onContent: (content: string) => void): Promise<void>;
}

export class ChatSubmissionService implements SubmissionService {
  constructor(
    private provider: AIProviderBase,
    private apiKey: string,
    private contentCallback: (content: string) => void,
    private streamHandler?: StreamHandler
  ) {
    if (!apiKey) {
      debug.error('submit', '⚠️ No API key provided for provider:', provider.id);
    }
    
    if (!streamHandler) {
      debug.error('submit', '⚠️ No stream handler provided for ChatSubmissionService');
    }
  }

  async submit(messages: MessageInterface[], config: RequestConfig): Promise<void> {
    debug.log('submit', `🔐 Submitting with API key: ${this.apiKey ? 'Key exists' : 'Key missing'}`);
    debug.log('submit', `🔄 Stream handler: ${this.streamHandler ? 'exists' : 'missing'}`);
    
    if (!this.apiKey) {
      throw new Error('API key is missing. Please add your API key in settings.');
    }
    
    if (!this.streamHandler) {
      debug.error('submit', 'Stream handler is missing. Cannot process streaming response.');
      throw new Error('Stream handler is missing. Cannot process streaming response.');
    }
    
    // Validate that messages is an array
    if (!Array.isArray(messages)) {
      debug.error('submit', 'Invalid messages parameter:', messages);
      throw new Error('Messages must be an array');
    }
    
    // Ensure config has required properties
    const safeConfig: RequestConfig = {
      model: config.model,
      max_tokens: config.max_tokens,
      temperature: config.temperature,
      top_p: config.top_p,
      presence_penalty: config.presence_penalty || 0,
      frequency_penalty: config.frequency_penalty || 0,
      stream: true,
      thinking: config.thinking
    };
    
    // Format request using provider's implementation
    debug.log('submit', `📝 Formatting request for provider: ${this.provider.id}`);
    const formattedRequest = this.provider.formatRequest(messages, safeConfig);

    try {
      // Get the current abort controller from Zustand
      const { abortController } = useStore.getState();
      
      // Prepare the endpoint URL
      const endpoint = this.provider.endpoints[0];
      const apiEndpoint = endpoint.startsWith('http') 
        ? endpoint 
        : endpoint.startsWith('/api') 
          ? endpoint 
          : `/api${endpoint}`;
      
      debug.log('submit', `📤 Submitting to endpoint: ${apiEndpoint}`);
      
      // Prepare the request body
      const requestBody = {
        // Include the entire formatted request directly (not nested)
        ...formattedRequest,
        // Add API key
        apiKey: this.apiKey
      };

      // Make the API request
      debug.log('submit', `🚀 Making fetch request to ${apiEndpoint}`);
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: abortController?.signal
      });

      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          if (errorData.error) {
            errorMessage = `API Error: ${errorData.error}`;
          }
        } catch (_) {
          try {
            const errorText = await response.text();
            if (errorText) {
              errorMessage = `API Error: ${errorText}`;
            }
          } catch (_) {
            // Use default message
          }
        }
        throw new Error(errorMessage);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('Response body is null');

      debug.log('submit', `📥 Processing stream response`);
      await this.streamHandler.processStream(reader, this.contentCallback);
      debug.log('submit', `✅ Stream processing complete`);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        debug.log('submit', `🛑 Request was aborted: ${error.message}`);
      } else {
        debug.error('submit', `❌ Submit error:`, error);
        throw error;
      }
    }
  }
}