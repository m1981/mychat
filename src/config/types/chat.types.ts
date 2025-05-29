import { ProviderKey } from './provider.types';
import { ModelConfig } from './model.types';

export type Role = 'user' | 'assistant' | 'system';

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