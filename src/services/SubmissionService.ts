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
    
    const formattedRequest = this.provider.formatRequest(messages, {
      ...modelConfig,
      stream: true
    });

    try {
      // Get the current abort controller from Zustand
      const { abortController } = useStore.getState();
      
      const response = await fetch(`/api/chat/${this.provider.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify({
          messages: formattedRequest.messages,
          config: formattedRequest,
          apiKey: this.apiKey,
        }),
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