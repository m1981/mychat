// Re-export all types from the new location
import { 
  ChatInterface, 
  MessageInterface, 
  Role, 
  ChatConfig,
  // Import these from the updated chat.types.ts
  Folder,
  FolderCollection,
  ChatHistoryInterface,
  ModelOptions,
  // Import ProviderKey from the re-export in chat.types.ts
  ProviderKey
} from '@config/types/chat.types';
import { ModelConfig } from '@config/types/model.types';

// Re-export types from new location using 'export type'
export type {
  ChatInterface,
  MessageInterface,
  Role,
  ModelConfig,
  ProviderKey,
  ChatConfig,
  Folder,
  FolderCollection,
  ChatHistoryInterface,
  ModelOptions
};