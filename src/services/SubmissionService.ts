import { MessageInterface, ModelConfig } from '@type/chat';
import { providers } from '@type/providers';
import { ChatStreamHandler } from '../handlers/ChatStreamHandler';

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
    private streamHandler: ChatStreamHandler
  ) {}

  async submit(messages: MessageInterface[], config: ModelConfig): Promise<void> {
    const formattedRequest = this.provider.formatRequest(messages, {
      ...config,
      stream: true
    });

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
    this.streamHandler.abort();
  }
}