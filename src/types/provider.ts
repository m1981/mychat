import { MessageInterface } from '@config/types/chat.types';
import { ModelConfig } from '@config/types/model.types';

export type ProviderKey = 'openai' | 'anthropic';

export interface RequestConfig extends ModelConfig {
  stream?: boolean;
}

export interface FormattedRequest {
  messages: any[];
  model: string;
  [key: string]: any;
}

export interface ProviderResponse {
  content?: string | any[];
  choices?: any[];
  [key: string]: any;
}

export interface AIProvider {
  id: string;
  name: string;
  endpoints: string[];
  models: string[];
  formatRequest: (messages: MessageInterface[], config: RequestConfig) => FormattedRequest;
  parseResponse: (response: ProviderResponse) => string;
  parseStreamingResponse: (response: ProviderResponse) => string;
}
