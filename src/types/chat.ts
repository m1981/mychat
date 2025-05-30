// Re-export all types from the new location
import { ChatInterface, MessageInterface, Role } from '@config/types/chat.types';
import { ModelConfig } from '@config/types/model.types';
import { ProviderKey } from '@config/types/provider.types';
import { ChatConfig } from '@config/types/chat.types';

// Additional types that might not be in the new structure
export interface ChatHistoryInterface {
  id: string;
  title: string;
  timestamp: number;
  folder?: string;
  index?: number; // Add index property
}

export interface Folder {
  id: string;
  name: string;
  expanded: boolean;
  order: number;
  color?: string; // Add color property
}

export interface FolderCollection {
  [key: string]: Folder;
}

export type ModelOptions = string;

// Re-export types from new location using 'export type'
export type {
  ChatInterface,
  MessageInterface,
  Role,
  ModelConfig,
  ProviderKey,
  ChatConfig
};