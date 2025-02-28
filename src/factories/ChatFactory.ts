import { DEFAULT_CHAT_CONFIG } from '@config/defaults/ChatDefaults';
import { ChatInterface } from '@type/chat';
import { generateUUID } from '@utils/uuid';

export class ChatFactory {
  static createChat(title?: string, folder?: string): ChatInterface {
    return {
      id: generateUUID(),
      title: title || 'New Chat',
      messages: [],
      config: DEFAULT_CHAT_CONFIG,
      titleSet: false,
      folder,
      timestamp: Date.now()
    };
  }

  static createDefaultChats(): ChatInterface[] {
    return [
      this.createChat('Project Planning Assistant', 'work-folder'),
      this.createChat('Study Notes & Explanations', 'learning-folder'),
    ];
  }
}