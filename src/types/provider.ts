import { MessageInterface, ConfigInterface } from '@type/chat';
export interface RequestConfig extends ConfigInterface {
  stream?: boolean;
}

export interface AIProvider {
  id: 'openai' | 'anthropic';
  name: string;
  endpoints: string[];
  models: string[];
  maxTokens: Record<string, number>;
  costs: Record<string, { price: number; unit: number }>;
  formatRequest: (messages: MessageInterface[], config: RequestConfig) => any;
  parseResponse: (response: any) => string;
  parseStreamingResponse: (chunk: any) => string;
}