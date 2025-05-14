import { MessageInterface, ModelConfig, ProviderKey } from '@type/chat';

export interface RequestConfig extends ModelConfig {
  stream?: boolean;  // Optional in incoming config
  thinking_mode?: {
    enabled: boolean;
    budget_tokens: number;
  };
}

export interface FormattedRequest {
  messages: MessageInterface[];
  model: string;
  max_tokens: number;
  temperature: number;
  top_p: number;
  stream: boolean;
  thinking?: {
    type: 'enabled';
    budget_tokens: number;
  };
  presence_penalty?: number;
  frequency_penalty?: number;
}

// Define a generic response type
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

export interface AIProvider {
  id: ProviderKey;
  name: string;
  endpoints: string[];
  models: string[];
  formatRequest: (messages: MessageInterface[], config: RequestConfig) => FormattedRequest;
  parseResponse: (response: ProviderResponse) => string;
  parseStreamingResponse: (chunk: ProviderResponse) => string;
}
