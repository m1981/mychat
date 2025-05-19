import { MessageInterface, ModelConfig, ProviderKey } from '@type/chat';

export interface RequestConfig extends ModelConfig {
  stream?: boolean;  // Optional in incoming config
  thinking_mode?: {
    enabled: boolean;
    budget_tokens: number;
  };
}

export interface FormattedRequest {
  // Common fields required by all providers
  messages: any[]; // Provider-specific message format
  model: string;
  max_tokens: number;
  temperature: number;
  top_p: number;
  stream: boolean;
  
  // Optional provider-specific fields
  system?: string;         // For providers that support system prompts
  thinking?: {             // For providers that support thinking mode
    type: string;          // Type of thinking mode
    budget_tokens: number;
  };
  presence_penalty?: number;
  frequency_penalty?: number;
  
  // Allow additional provider-specific fields
  [key: string]: unknown;
}

// Define a standardized response type
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

export interface AIProviderInterface {
  id: string;
  name: string;
  endpoints: string[];
  models: string[];
  formatRequest: (config: RequestConfig, messages: MessageInterface[]) => FormattedRequest;
  parseResponse: (response: any) => string;
  parseStreamingResponse: (response: any) => string;
  submitCompletion: (formattedRequest: FormattedRequest) => Promise<ProviderResponse>;
  submitStream: (formattedRequest: FormattedRequest) => Promise<ReadableStream>;
}
