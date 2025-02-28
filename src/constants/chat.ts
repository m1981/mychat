import { ChatInterface } from '@type/chat';
import { generateUUID } from '@utils/uuid';
import { DEFAULT_CHAT_CONFIG } from '@config/chat/ChatConfig';

// Chat Factory
export const generateDefaultChat = (title?: string, folder?: string): ChatInterface => ({
  id: generateUUID(),
  title: title || 'New Chat',
  messages: [],
  config: DEFAULT_CHAT_CONFIG,
  titleSet: false,
  folder,
  timestamp: Date.now()
});

// Default folders configuration
export const DEFAULT_FOLDERS = {
  [generateUUID()]: {
    id: 'work-folder',
    name: 'Work Assistant',
    expanded: true,
    order: 0,
    color: '#2563eb',
  },
  [generateUUID()]: {
    id: 'learning-folder',
    name: 'Learning & Study',
    expanded: true,
    order: 1,
    color: '#16a34a',
  },
};

// Default chats
export const DEFAULT_CHATS: ChatInterface[] = [
  generateDefaultChat('Project Planning Assistant', 'work-folder'),
  generateDefaultChat('Study Notes & Explanations', 'learning-folder'),
];

// Re-export configuration
export { 
  DEFAULT_CHAT_CONFIG,
  DEFAULT_SYSTEM_MESSAGE 
} from '@config/chat/ChatConfig';

// Move SUPPORTED_CODE_LANGUAGES to a separate constants file
export { SUPPORTED_CODE_LANGUAGES } from '@constants/SupportedLanguages';
