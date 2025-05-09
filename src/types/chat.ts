export type Role = 'user' | 'assistant' | 'system';
export type ProviderKey = 'anthropic' | 'openai' | string;

export interface ModelConfig {
  model: string;
  max_tokens: number;
  temperature: number;
  presence_penalty: number;
  top_p: number;
  frequency_penalty: number;
  // Added in v1.x.x: Support for thinking mode
  enableThinking: boolean;
  thinkingConfig: {
    budget_tokens: number;
  };
}

export interface ChatConfig {
  provider: ProviderKey;
  modelConfig: ModelConfig;
}

export interface MessageInterface {
  role: Role;
  content: string;
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
