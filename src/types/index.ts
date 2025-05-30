/**
 * Central type definition system
 * 
 * This file serves as the single entry point for all type definitions.
 * Import types from here instead of from individual files.
 */

// Provider types
export type ProviderKey = 'openai' | 'anthropic';

export interface ProviderModel {
  id: string;
  name: string;
  maxCompletionTokens: number; // Make this required instead of optional
  cost?: {
    input: {
      price: number;
      unit: number;
    };
    output: {
      price: number;
      unit: number;
    };
  };
}

export interface ProviderConfig {
  id: ProviderKey;
  name: string;
  models: ProviderModel[];
  endpoints: any[];
  capabilities: {
    supportsThinking: boolean;
    defaultThinkingModel: string | undefined;
    maxCompletionTokens: number;
    defaultModel: string;
    defaultThinkingBudget?: number;
  };
}

export interface AIProvider {
  id: ProviderKey;
  name: string;
  endpoints: any[];
  models: string[];
  formatRequest: (messages: MessageInterface[], config: RequestConfig) => FormattedRequest;
  parseResponse: (response: any) => string;
  parseStreamingResponse?: (response: ProviderResponse) => string;
}

// Model types
export interface ModelConfig {
  model: string;
  temperature: number;
  top_p: number;
  presence_penalty: number;
  frequency_penalty: number;
  max_tokens: number;
  enableThinking?: boolean;
  thinkingConfig?: {
    budget_tokens: number;
  };
}

export interface ModelCapabilities {
  modelId: string;
  provider: ProviderKey;
  maxResponseTokens: number;
  defaultResponseTokens: number;
  supportsThinking?: boolean;
  defaultThinkingBudget?: number;
}

// Request/Response types
export interface FormattedRequest {
  [key: string]: any;
}

export interface RequestConfig extends ModelConfig {
  stream?: boolean;
}

export interface ProviderResponse {
  content?: string | any[];
  choices?: any[];
  [key: string]: any;
}

// Chat types
export type Role = 'user' | 'assistant' | 'system';

export interface MessageInterface {
  role: Role;
  content: string;
  id?: string;
}

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
  timestamp?: number;
  currentChatTokenCount?: number;
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

// Export types
export interface ExportFormat {
  folders: FolderCollection;
  version: number;
  chats: ChatInterface[];
}

export type Export = ExportFormat;
export type LegacyExport = ChatInterface[];

// For backward compatibility
export type ModelOptions = string;
