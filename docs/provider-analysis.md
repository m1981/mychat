// Core Provider Types
type ProviderKey = 'openai' | 'anthropic';

interface AIProvider {
  id: ProviderKey;
  name: string;
  endpoints: string[];
  models: string[];
  formatRequest: (messages: MessageInterface[], config: RequestConfig) => FormattedRequest;
  parseResponse: (response: any) => string;
  parseStreamingResponse: (chunk: any) => string;
}

// Provider Configuration
interface ProviderConfig {
  id: ProviderKey;
  name: string;
  defaultModel: string;
  endpoints: string[];
  models: ProviderModel[];
}

// Request/Response Types
interface RequestConfig {
  model: string;
  max_tokens: number;
  temperature: number;
  top_p: number;
  stream: boolean;
  thinking?: {
    type: 'enabled';
    budget_tokens: number;
  };
}

interface FormattedRequest {
  messages: any[]; // Provider-specific message format
  model: string;
  max_tokens: number;
  temperature: number;
  top_p: number;
  stream: boolean;
  [key: string]: any; // Additional provider-specific parameters
}