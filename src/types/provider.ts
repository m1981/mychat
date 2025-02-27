import { MessageInterface, ModelConfig, ProviderKey } from '@type/chat';

export interface RequestConfig extends ModelConfig {
  stream?: boolean;
  // Add any provider-specific handling for thinking mode
  thinking_mode?: {
    enabled: boolean;
    budget_tokens: number;
  };
}

export interface AIProvider {
  id: ProviderKey;
  name: string;
  endpoints: string[];
  models: string[];
  formatRequest: (messages: MessageInterface[], config: RequestConfig) => any;
  parseResponse: (response: any) => string;
  parseStreamingResponse: (chunk: any) => string;
}
