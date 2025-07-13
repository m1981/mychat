/**
 * Chat-related types
 * Imports core types from provider.ts
 */
import { MessageInterface, ProviderKey } from './provider';

export interface ModelConfig {
  provider: ProviderKey;
  model: string;
  max_tokens: number;
  temperature: number;
  top_p: number;
  presence_penalty: number;
  frequency_penalty: number;
  thinking_mode: {
    enabled: boolean;
    budget_tokens: number;
  };
}

export interface ChatConfig {
  provider: ProviderKey;
  modelConfig: ModelConfig;
}

export interface ChatInterface {
  id: string;
  title: string;
  folder?: string;
  messages: MessageInterface[];
  config: ChatConfig;
  titleSet: boolean;
  currentChatTokenCount?: number;
  timestamp?: number;
}

export interface ChatHistoryInterface {
  title: string;
  index: number;
  id: string;
}

export interface FolderCollection {
  [folderId: string]: Folder;
}

export interface Folder {
  id: string;
  name: string;
  expanded: boolean;
  order: number;
  color?: string;
}

export type ModelOptions = string;
