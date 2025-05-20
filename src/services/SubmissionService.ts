import useStore from '@store/store';
import { MessageInterface, ModelConfig } from '@type/chat';
import { providers } from '@type/providers';

export interface SubmissionService {
  submit(messages: MessageInterface[], config: ModelConfig): Promise<void>;
}

export class ChatSubmissionService implements SubmissionService {
  constructor(
    private provider: typeof providers[keyof typeof providers],
    private apiKey: string,
    private contentCallback: (content: string) => void,
    private streamHandler: {
      processStream: (reader: ReadableStreamDefaultReader<Uint8Array>, callback: (content: string) => void) => Promise<void>
    }
  ) {
    // Add validation for API key
    if (!this.apiKey) {
      console.error('⚠️ No API key provided for provider:', provider);
    }
  }

  async submit(messages: MessageInterface[], modelConfig: ModelConfig): Promise<void> {
    console.log('🔐 Submitting with API key:', this.apiKey ? 'Key exists' : 'Key missing');
    
    if (!this.apiKey) {
      throw new Error('API key is missing. Please add your API key in settings.');
    }
    
    // Validate that messages is an array
    if (!Array.isArray(messages)) {
      console.error('Invalid messages parameter:', messages);
      throw new Error('Messages must be an array');
    }
    
    const formattedRequest = this.provider.formatRequest(messages, {
      ...modelConfig,
      stream: true
    });

    try {
      // Get the current abort controller from Zustand
      const { abortController } = useStore.getState();
      
      // Preserve the provider's formatted request structure
      // Only add API key and extract basic config for logging/tracking
      const requestBody = {
        // Include the entire formatted request
        ...formattedRequest,
        // Add API key
        apiKey: this.apiKey,
        // Include config separately for logging/tracking purposes
        config: {
          model: formattedRequest.model,
          max_tokens: formattedRequest.max_tokens,
          temperature: formattedRequest.temperature,
          top_p: formattedRequest.top_p,
          stream: true,
          enableThinking: formattedRequest.thinking ? true : false,
          thinkingConfig: formattedRequest.thinking ? {
            budget_tokens: formattedRequest.thinking.budget_tokens
          } : undefined
        }
      };

      const response = await fetch(`/api/chat/${this.provider.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
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