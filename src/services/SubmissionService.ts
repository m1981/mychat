import { MessageInterface, ModelConfig } from '@type/chat';
import { providers } from '@type/providers';
import { ChatStreamHandler } from '../handlers/ChatStreamHandler';
import useStore from '@store/store';

type Provider = (typeof providers)[keyof typeof providers];

export interface SubmissionService {
  submit(messages: MessageInterface[], config: ModelConfig): Promise<void>;
  abort(): void;
}

export class ChatSubmissionService implements SubmissionService {
  constructor(
    private provider: Provider,
    private apiKey: string,
    private onContent: (content: string) => void,
    private streamHandler: ChatStreamHandler,
    // Remove the abortController parameter - we'll use Zustand instead
  ) {}

  async submit(messages: MessageInterface[], config: ModelConfig): Promise<void> {
    const formattedRequest = this.provider.formatRequest(messages, {
      ...config,
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
        // Use the abort controller from Zustand
        signal: abortController?.signal
      });

      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          // Try to parse error response
          const errorData = await response.json();
          if (errorData.error) {
            errorMessage = `API Error: ${errorData.error}`;
          }
        } catch (e) {
          // If we can't parse JSON, try to get text
          try {
            const errorText = await response.text();
            if (errorText) {
              errorMessage = `API Error: ${errorText}`;
            }
          } catch (textError) {
            // If we can't get text either, use the default message
          }
        }
        throw new Error(errorMessage);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('Response body is null');

      await this.streamHandler.processStream(reader, this.onContent);
    } catch (error) {
      // Rethrow with better error message
      if (error instanceof Error) {
        console.error('Submission error details:', error);
        throw error;
      } else {
        throw new Error('Unknown error during submission');
      }
    }
  }

  abort(): void {
    // Use Zustand to abort the request
    const { stopRequest } = useStore.getState();
    stopRequest('User aborted request');
  }
}