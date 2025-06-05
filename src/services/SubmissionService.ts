import useStore from '@store/store';
import { MessageInterface } from '@type/chat';
import { AIProviderInterface, ModelConfig, RequestConfig } from '@type/provider';
import { debug } from '@utils/debug';

export interface SubmissionService {
  submit(messages: MessageInterface[], config: RequestConfig): Promise<void>;
}

export class ChatSubmissionService implements SubmissionService {
  constructor(
    private provider: AIProviderInterface,
    private apiKey: string,
    private contentCallback: (content: string) => void,
    private streamHandler: {
      processStream: (reader: ReadableStreamDefaultReader<Uint8Array>, callback: (content: string) => void) => Promise<void>
    }
  ) {
    // Add validation for API key
    if (!this.apiKey) {
      console.error('⚠️ No API key provided for provider:', provider.id);
    }
  }

  async submit(messages: MessageInterface[], config: RequestConfig): Promise<void> {
    debug.log('submission', `🔐 Submitting with API key: ${this.apiKey ? 'Key exists' : 'Key missing'}`);
    
    if (!this.apiKey) {
      throw new Error('API key is missing. Please add your API key in settings.');
    }
    
    // Validate that messages is an array
    if (!Array.isArray(messages)) {
      console.error('Invalid messages parameter:', messages);
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
      
      debug.log('submission', `📤 Submitting to endpoint: ${apiEndpoint}`);
      
      // Prepare the request body
      const requestBody = {
        // Include the entire formatted request directly (not nested)
        ...formattedRequest,
        // Add API key
        apiKey: this.apiKey
      };

      // Make the API request
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

      await this.streamHandler.processStream(reader, this.contentCallback);
    } catch (error) {
      if (error instanceof Error) {
        console.error('Submission error details:', error);
        throw error;
      } else {
        throw new Error('Unknown error during submission');
      }
    }
  }
}