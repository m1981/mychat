import { MessageInterface, ModelConfig } from '@type/chat';
import { providers } from '@type/providers';
import { ChatStreamHandler } from '../handlers/ChatStreamHandler';
import useStore from '@store/store';

type Provider = (typeof providers)[keyof typeof providers];

export interface SubmissionService {
  submit(messages: MessageInterface[], config: ModelConfig): Promise<void>;
}

export class ChatSubmissionService implements SubmissionService {
  constructor(
    private provider: Provider,
    private apiKey: string,
    private onContent: (content: string) => void,
    private streamHandler: ChatStreamHandler
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
        signal: abortController?.signal
      });

      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          if (errorData.error) {
            errorMessage = `API Error: ${errorData.error}`;
          }
        } catch (e) {
          try {
            const errorText = await response.text();
            if (errorText) {
              errorMessage = `API Error: ${errorText}`;
            }
          } catch (textError) {
            // Use default message
          }
        }
        throw new Error(errorMessage);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('Response body is null');

      await this.streamHandler.processStream(reader, this.onContent);
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
