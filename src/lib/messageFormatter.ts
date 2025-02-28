import { MessageInterface } from '@type/chat';

export class MessageFormatter {
  static formatForAnthropic(messages: MessageInterface[]) {
    return messages.map(message => ({
      role: message.role === 'assistant' ? 'assistant' : 'user',
      content: message.content
    }));
  }
}