import { MessageInterface } from '@type/chat';

// Use literal union type with string extension for future compatibility
export type ProviderKey = 'anthropic' | 'openai' | (string & {});

// Provider capabilities with readonly properties
export interface ProviderCapabilities {
  readonly supportsThinking: boolean;
  readonly maxCompletionTokens: number;
  readonly defaultModel: string;
  readonly defaultThinkingModel?: string;
}

// Base model configuration with readonly properties
export interface BaseModelConfig {
  readonly model: string;
  readonly max_tokens: number;
  readonly temperature: number;
  readonly top_p: number;
  readonly presence_penalty?: number;
  readonly frequency_penalty?: number;
}

// Request configuration extends base model config
export interface RequestConfig extends BaseModelConfig {
  readonly stream?: boolean;
  readonly thinking?: {
    readonly enabled: boolean;
    readonly budget_tokens: number;
  };
  readonly thinking_mode?: {
    readonly enabled: boolean;
    readonly budget_tokens: number;
  };
}

// Formatted request for API submission
export interface FormattedRequest {
  model: string;
  max_tokens: number;
  temperature: number;
  top_p: number;
  presence_penalty?: number;
  frequency_penalty?: number;
  stream?: boolean;
  messages: Array<{
    role: string;
    content: string;
  }>;
  system?: string;
  thinking?: {
    type: string;
    budget_tokens: number;
  };
  [key: string]: any; // Allow for provider-specific extensions
}

// Provider response type
export type ProviderResponse = any;

// AI Provider interface
export interface AIProviderBase {
  readonly id: ProviderKey;
  readonly name: string;
  readonly endpoints: string[];
  readonly models: string[];
  readonly capabilities: ProviderCapabilities;
  
  formatRequest(messages: MessageInterface[], config: RequestConfig): FormattedRequest;
  parseResponse(response: unknown): string;
  parseStreamingResponse(response: unknown): string;
  submitCompletion(formattedRequest: Readonly<FormattedRequest>): Promise<ProviderResponse>;
  submitStream(formattedRequest: Readonly<FormattedRequest>): Promise<ReadableStream>;
}
