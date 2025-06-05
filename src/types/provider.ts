import { MessageInterface, ModelConfig, ProviderKey } from '@type/chat';

// Core provider types
export type ProviderKey = 'anthropic' | 'openai' | string;

// Provider capabilities
export interface ProviderCapabilities {
  supportsThinking: boolean;
  maxCompletionTokens: number;
  defaultModel: string;
  defaultThinkingModel?: string;
}

// Base model configuration
export interface BaseModelConfig {
  model: string;
  max_tokens: number;
  temperature: number;
  top_p: number;
  presence_penalty?: number;
  frequency_penalty?: number;
}

// Thinking mode configuration
export interface ThinkingConfig {
  enabled: boolean;
  budget_tokens: number;
}

// Complete model configuration
export interface ModelConfig extends BaseModelConfig {
  provider: ProviderKey;
  thinking?: ThinkingConfig;
}

// Request configuration
export interface RequestConfig extends BaseModelConfig {
  stream?: boolean;
  thinking?: ThinkingConfig;
}

// Provider-specific formatted request
export interface FormattedRequest {
  // Common fields required by all providers
  model: string;
  max_tokens: number;
  temperature: number;
  top_p: number;
  stream: boolean;
  messages: any[]; // Provider-specific message format
  
  // Optional provider-specific fields
  system?: string;
  thinking?: {
    type: string;
    budget_tokens: number;
  };
  presence_penalty?: number;
  frequency_penalty?: number;
  
  // Allow additional provider-specific fields
  [key: string]: unknown;
}

// Provider response
export interface ProviderResponse {
  content?: string | Array<{text: string}>;
  choices?: Array<{
    message?: { content?: string };
    delta?: { content?: string };
  }>;
  type?: string;
  delta?: { 
    text?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

// Provider interface
export interface AIProviderInterface {
  id: ProviderKey;
  name: string;
  endpoints: string[];
  models: string[];
  formatRequest: (messages: MessageInterface[], config: RequestConfig) => FormattedRequest;
  parseResponse: (response: any) => string;
  parseStreamingResponse: (response: any) => string;
  submitCompletion: (formattedRequest: FormattedRequest) => Promise<ProviderResponse>;
  submitStream: (formattedRequest: FormattedRequest) => Promise<ReadableStream>;
}