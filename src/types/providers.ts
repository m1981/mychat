
import { ModelRegistry } from '@config/models/model.registry';
import { PROVIDER_CONFIGS } from '@config/providers/provider.config';
import { MessageInterface, ProviderKey } from '@type/chat';
import { AIProviderInterface, ProviderResponse, RequestConfig, FormattedRequest } from '@type/provider';
import store from '@store/store';

export interface AIProviderInterface {
  id: string;
  name: string;
  endpoints: string[];
  models: string[];
  
  // Standardize parameter order: messages first, then config
  formatRequest: (messages: MessageInterface[], config: RequestConfig) => FormattedRequest;
  parseResponse: (response: ProviderResponse) => string;
  parseStreamingResponse: (response: ProviderResponse) => string;
  submitCompletion: (formattedRequest: FormattedRequest) => Promise<ProviderResponse>;
  submitStream: (formattedRequest: FormattedRequest) => Promise<ReadableStream>;
}

// Create provider implementations using configuration data directly
export const providers: Record<ProviderKey, AIProviderInterface> = {
  openai: {
    id: 'openai',
    name: PROVIDER_CONFIGS.openai.name,
    endpoints: PROVIDER_CONFIGS.openai.endpoints,
    models: PROVIDER_CONFIGS.openai.models.map(m => m.id),
    formatRequest: (messages: MessageInterface[], config: RequestConfig): FormattedRequest => {
      // Validate inputs
      if (!Array.isArray(messages)) {
        console.error('Invalid messages parameter in OpenAI formatRequest:', messages);
        // Return a minimal valid request to avoid crashing
        return {
          model: config.model || 'gpt-4o',
          max_tokens: config.max_tokens || 1000,
          temperature: config.temperature || 0.7,
          top_p: config.top_p || 1,
          stream: config.stream || false,
          messages: []
        };
      }
      
      const formattedRequest = {
        messages: messages
          .filter(m => m.content.trim() !== '')
          .map(m => ({
            role: m.role,
            content: m.content
          })),
        model: config.model,
        max_tokens: ModelRegistry.getModelCapabilities(config.model).maxResponseTokens,
        temperature: config.temperature,
        presence_penalty: config.presence_penalty,
        top_p: config.top_p,
        frequency_penalty: config.frequency_penalty,
        stream: config.stream ?? false
      };

      return formattedRequest;
    },
    parseResponse: (response: ProviderResponse): string => {
      if (response.choices?.[0]?.message?.content) {
        return response.choices[0].message.content;
      }
      // Handle direct content response ( used in tests )
      if (response.content && typeof response.content === 'string') {
        return response.content;
      }
      throw new Error('Invalid response format from OpenAI');
    },
    parseStreamingResponse: (response: ProviderResponse): string => {
      try {
        return response.choices?.[0]?.delta?.content || '';
      } catch (e) {
        console.error('Error parsing OpenAI response:', e);
        return '';
      }
    },
    submitCompletion: async (formattedRequest: FormattedRequest): Promise<ProviderResponse> => {
      const apiKey = store.getState().apiKeys.openai;
      const endpoint = PROVIDER_CONFIGS.openai.endpoints[0];
      
      const apiEndpoint = endpoint.startsWith('http') 
        ? endpoint 
        : endpoint.startsWith('/api') 
          ? endpoint 
          : `/api${endpoint}`;
      
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          formattedRequest, // Send the formatted request directly
          apiKey
        })
      });
      
      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }
      
      return await response.json();
    },
    submitStream: async (formattedRequest: FormattedRequest): Promise<ReadableStream> => {
      const apiKey = store.getState().apiKeys.openai;
      const endpoint = PROVIDER_CONFIGS.openai.endpoints[0];
      
      // Determine if we're using a local API endpoint or an external one
      const apiEndpoint = endpoint.startsWith('http') 
        ? endpoint 
        : endpoint.startsWith('/api') 
          ? endpoint 
          : `/api${endpoint}`;
      
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({...formattedRequest, stream: true})
      });
      
      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }
      
      return response.body as ReadableStream;
    }
  },
  anthropic: {
    id: 'anthropic',
    name: PROVIDER_CONFIGS.anthropic.name,
    endpoints: PROVIDER_CONFIGS.anthropic.endpoints,
    models: PROVIDER_CONFIGS.anthropic.models.map(m => m.id),
    formatRequest: (messages: MessageInterface[], config: RequestConfig): FormattedRequest => {
      // Validate inputs
      if (!Array.isArray(messages)) {
        console.error('Invalid messages parameter in Anthropic formatRequest:', messages);
        // Return a minimal valid request to avoid crashing
        return {
          model: config.model || 'claude-3-7-sonnet-20250219',
          max_tokens: config.max_tokens || 1000,
          temperature: config.temperature || 0.7,
          top_p: config.top_p || 1,
          stream: config.stream || false,
          messages: []
        };
      }
      
      // Extract system message if present
      const systemMessage = messages.find(m => m.role === 'system');
      
      // Filter out system messages and empty messages for the regular message array
      const regularMessages = messages
        .filter(m => m.role !== 'system')
        .filter(m => m.content && m.content.trim() !== '')
        .map(m => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content,
        }));
      
      const formattedRequest = {
        model: config.model,
        max_tokens: config.max_tokens,
        temperature: config.temperature,
        top_p: config.top_p,
        stream: config.stream ?? false,
        thinking: config.thinking_mode?.enabled ? {
          type: "enabled" as const,
          budget_tokens: config.thinking_mode.budget_tokens
        } : undefined,
        ...(systemMessage && { system: systemMessage.content }),
        messages: regularMessages
      };

      return formattedRequest;
    },
    parseResponse: (response: ProviderResponse): string => {
      // Handle non-streaming response
      if (response.content && Array.isArray(response.content) && response.content.length > 0 && 'text' in response.content[0]) {
        return response.content[0].text;
      }
      // If content is a string, return it
      if (typeof response.content === 'string') {
        return response.content;
      }
      return '';
    },
    parseStreamingResponse: (response: ProviderResponse): string => {
      try {
        if (response.type === 'content_block_delta') {
          return response.delta?.text || '';
        }
        return '';
      } catch (e) {
        console.error('Error parsing Anthropic response:', e);
        return '';
      }
    },
    submitCompletion: async (formattedRequest: FormattedRequest): Promise<ProviderResponse> => {
      const apiKey = store.getState().apiKeys.anthropic;
      const endpoint = PROVIDER_CONFIGS.anthropic.endpoints[0];
      
      const apiEndpoint = endpoint.startsWith('http') 
        ? endpoint 
        : endpoint.startsWith('/api') 
          ? endpoint 
          : `/api${endpoint}`;
      
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          formattedRequest, // Send the formatted request directly
          apiKey
        })
      });
      
      if (!response.ok) {
        throw new Error(`Anthropic API error: ${response.status}`);
      }
      
      return await response.json();
    },
    submitStream: async (formattedRequest: FormattedRequest): Promise<ReadableStream> => {
      const apiKey = store.getState().apiKeys.anthropic;
      const endpoint = PROVIDER_CONFIGS.anthropic.endpoints[0];
      
      // Determine if we're using a local API endpoint or an external one
      const apiEndpoint = endpoint.startsWith('http') 
        ? endpoint 
        : endpoint.startsWith('/api') 
          ? endpoint 
          : `/api${endpoint}`;
      
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({...formattedRequest, stream: true})
      });
      
      if (!response.ok) {
        throw new Error(`Anthropic API error: ${response.status}`);
      }
      
      return response.body as ReadableStream;
    }
  },
};

// Add a factory function to create provider implementation instances
export function getProviderImplementation(key: ProviderKey): AIProviderInterface {
  const provider = providers[key];
  if (!provider) {
    throw new Error(`Provider implementation for ${key} not found`);
  }
  return provider;
}
