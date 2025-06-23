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

// Thinking mode configuration with readonly properties
export interface ThinkingConfig {
  readonly enabled: boolean;
  readonly budget_tokens: number;
}

// Complete model configuration
export interface ModelConfig extends BaseModelConfig {
  readonly provider: ProviderKey;
  readonly thinking?: Readonly<ThinkingConfig>;
}

// Request configuration
export interface RequestConfig extends BaseModelConfig {
  readonly stream?: boolean;
  readonly thinking?: Readonly<ThinkingConfig>;
}

// Provider-specific formatted request with discriminated union for thinking
export interface FormattedRequest {
  // Common fields required by all providers
  readonly model: string;
  readonly max_tokens: number;
  readonly temperature: number;
  readonly top_p: number;
  readonly stream: boolean;
  readonly messages: readonly unknown[]; // Provider-specific message format
  
  // Optional provider-specific fields
  readonly system?: string;
  readonly thinking?: {
    readonly type: 'enabled' | 'disabled';
    readonly budget_tokens: number;
  };
  readonly presence_penalty?: number;
  readonly frequency_penalty?: number;
  
  // Allow additional provider-specific fields with unknown type
  readonly [key: string]: unknown;
}

// Provider response with discriminated union pattern
export type ProviderResponse = 
  | { type?: string; content: string; [key: string]: unknown }
  | { type?: string; content: ReadonlyArray<{readonly text: string}>; [key: string]: unknown }
  | { type?: string; choices: ReadonlyArray<{
      readonly message?: { readonly content?: string };
      readonly delta?: { readonly content?: string };
    }>; [key: string]: unknown }
  | { type: 'content_block_delta'; delta: { 
      readonly text?: string;
      readonly [key: string]: unknown;
    }; [key: string]: unknown };

// Add type guard for provider responses
export function isStreamingResponse(response: unknown): response is ProviderResponse {
  if (!response || typeof response !== 'object') return false;
  
  const resp = response as Record<string, unknown>;
  return (
    // Anthropic streaming response
    (resp.type === 'content_block_delta' && resp.delta && typeof resp.delta === 'object') ||
    // OpenAI streaming response
    (resp.choices && Array.isArray(resp.choices) && resp.choices.length > 0 && 
     (resp.choices[0].delta || resp.choices[0].message))
  );
}

// Enhanced abstract provider with private fields
export abstract class AIProviderBase {
  readonly id: ProviderKey;
  readonly name: string;
  readonly endpoints: ReadonlyArray<string>;
  readonly models: ReadonlyArray<string>;
  #capabilities: ProviderCapabilities;

  constructor(
    id: ProviderKey,
    name: string,
    endpoints: ReadonlyArray<string>,
    models: ReadonlyArray<string>,
    capabilities: ProviderCapabilities
  ) {
    this.id = id;
    this.name = name;
    this.endpoints = endpoints;
    this.models = models;
    this.#capabilities = capabilities;
  }

  get capabilities(): Readonly<ProviderCapabilities> {
    return this.#capabilities;
  }

  // Abstract methods that must be implemented by concrete providers
  abstract formatRequest(
    messages: ReadonlyArray<MessageInterface>, 
    config: Readonly<RequestConfig>
  ): FormattedRequest;
  
  abstract parseResponse(response: unknown): string;
  abstract parseStreamingResponse(response: unknown): string;
  
  abstract submitCompletion(
    formattedRequest: Readonly<FormattedRequest>
  ): Promise<ProviderResponse>;
  
  abstract submitStream(
    formattedRequest: Readonly<FormattedRequest>
  ): Promise<ReadableStream>;
  
  // Protected helper methods
  protected validateResponse(response: unknown): asserts response is ProviderResponse {
    if (!response || typeof response !== 'object') {
      throw new TypeError('Invalid response format: response must be an object');
    }
  }
}

// Provider interface (for backward compatibility)
export interface AIProviderInterface {
  readonly id: ProviderKey;
  readonly name: string;
  readonly endpoints: ReadonlyArray<string>;
  readonly models: ReadonlyArray<string>;
  formatRequest: (
    messages: ReadonlyArray<MessageInterface>, 
    config: Readonly<RequestConfig>
  ) => FormattedRequest;
  parseResponse: (response: unknown) => string;
  parseStreamingResponse: (response: unknown) => string;
  submitCompletion: (
    formattedRequest: Readonly<FormattedRequest>
  ) => Promise<ProviderResponse>;
  submitStream: (
    formattedRequest: Readonly<FormattedRequest>
  ) => Promise<ReadableStream>;
}