import { DEFAULT_CHAT_CONFIG, DEFAULT_SYSTEM_MESSAGE } from '@config/chat/ChatConfig';
import { ChatInterface } from '@type/chat';
import { generateUUID } from '@utils/uuid';

// Chat Factory
export const generateDefaultChat = (title?: string, folder?: string, systemMessage?: string): ChatInterface => {
  return {
    id: generateUUID(),
    title: title || 'New Chat',
    messages: systemMessage 
      ? [{ role: 'system', content: systemMessage }] 
      : [],
    config: DEFAULT_CHAT_CONFIG,
    titleSet: false,
    folder,
    timestamp: Date.now()
  };
};


// Default chats
export const DEFAULT_CHATS: ChatInterface[] = [
  generateDefaultChat('Project Planning Assistant', 'work-folder', DEFAULT_SYSTEM_MESSAGE),
  generateDefaultChat('Study Notes & Explanations', 'learning-folder', DEFAULT_SYSTEM_MESSAGE),
];

// Re-export configuration
export { 
  DEFAULT_CHAT_CONFIG,
  DEFAULT_SYSTEM_MESSAGE 
} from '@config/chat/ChatConfig';
