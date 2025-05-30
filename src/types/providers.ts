import { ProviderKey, AIProvider, MessageInterface, RequestConfig, FormattedRequest } from '../types';
import { ModelRegistry } from '../registry';

// Create a type-safe providers object
export const providers: Record<ProviderKey, AIProvider> = {
  openai: {
    id: 'openai',
    name: 'OpenAI',
    endpoints: [],
    models: ModelRegistry.getModelsForProvider('openai'),
    formatRequest: (messages: MessageInterface[], config: RequestConfig): FormattedRequest => ({
      messages,
      model: config.model,
      max_tokens: ModelRegistry.getModelCapabilities(config.model).maxResponseTokens,
      temperature: config.temperature,
      presence_penalty: config.presence_penalty,
      top_p: config.top_p,
      frequency_penalty: config.frequency_penalty,
      stream: config.stream ?? false
    }),
    parseResponse: (_response: any): string => {
      // Implementation
      return '';
    }
  },
  anthropic: {
    id: 'anthropic',
    name: 'Anthropic',
    endpoints: [],
    models: ModelRegistry.getModelsForProvider('anthropic'),
    formatRequest: (_messages: MessageInterface[], _config: RequestConfig): FormattedRequest => {
      // Implementation
      return {};
    },
    parseResponse: (_response: any): string => {
      // Implementation
      return '';
    }
  }
};

// Add parseStreamingResponse to AIProvider interface in types/index.ts
