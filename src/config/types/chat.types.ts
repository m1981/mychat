import { ProviderKey } from './provider.types';
import { ModelConfig } from './model.types';

export interface MessageInterface {
  role: Role;
  content: string;
  id?: string;
}

export type Role = 'user' | 'assistant' | 'system';

export interface ChatConfig {
  provider: ProviderKey;
  modelConfig: ModelConfig;
}

export interface ChatInterface {
  id: string;
  title: string;
  messages: MessageInterface[];
  config: ChatConfig;
  folder?: string;
  titleSet?: boolean;
  currentChatTokenCount?: number;
  timestamp?: number;
}

export interface Folder {
  id: string;
  name: string;
  expanded: boolean;
  order: number;
  color?: string;
}

export interface FolderCollection {
  [key: string]: Folder;
}

export interface ChatHistoryInterface {
  title: string;
  id: string;
  folder?: string;
  index?: number;
  timestamp?: number;
}

export type ModelOptions = string;

// Re-export ProviderKey for convenience
export type { ProviderKey };