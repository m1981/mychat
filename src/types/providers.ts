
import { capabilityRegistry, createCapabilityContext } from '@capabilities/registry';
import { ModelRegistry } from '@config/models/model.registry';
import { PROVIDER_CONFIGS } from '@config/providers/provider.config';
import { MessageInterface, ProviderKey } from '@type/chat';
import { AIProviderInterface, ProviderResponse, RequestConfig, FormattedRequest } from '@type/provider';
import store from '@store/store';

// Provider-specific request formatters using strategy pattern
const requestFormatterStrategies = {
  openai: (messages: MessageInterface[], config: RequestConfig): FormattedRequest => {
    // Create base request
    const baseRequest = {
      model: config.model || 'gpt-4o',
      max_tokens: config.max_tokens || 1000,
      temperature: config.temperature || 0.7,
      top_p: config.top_p || 1,
      presence_penalty: config.presence_penalty || 0,
      frequency_penalty: config.frequency_penalty || 0,
      stream: config.stream || false,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content
      }))
    };
    
    // Apply capability middleware
    const context = createCapabilityContext('openai', config.model, config);
    return capabilityRegistry.applyRequestMiddleware(baseRequest, context);
  },
  
  anthropic: (messages: MessageInterface[], config: RequestConfig): FormattedRequest => {
    if (!Array.isArray(messages)) {
      console.error('Invalid messages parameter in Anthropic formatRequest:', messages);
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
    
    // Create the formatted request with provider-specific thinking mode
    const formattedRequest: FormattedRequest = {
      model: config.model,
      max_tokens: config.max_tokens,
      temperature: config.temperature,
      top_p: config.top_p,
      stream: config.stream ?? false,
      messages: regularMessages
    };

    // Add system message if present
    if (systemMessage && systemMessage.content) {
      formattedRequest.system = systemMessage.content;
    }

    // Add thinking configuration if enabled and supported
    if (config.thinking_mode?.enabled) {
      formattedRequest.thinking = {
        type: "enabled" as const,
        budget_tokens: config.thinking_mode.budget_tokens
      };
    }

    return formattedRequest;
  }
};

// Provider-specific response parsers
const responseParserStrategies = {
  openai: {
    parseResponse: (response: ProviderResponse): string => {
      // Handle direct content response (used in tests)
      if (response.content) {
        return response.content;
      }
      
      // Handle standard OpenAI response format
      if (response.choices && 
          response.choices[0] && 
          response.choices[0].message && 
          response.choices[0].message.content !== undefined) {
        return response.choices[0].message.content;
      }
      
      // If we get here, the response format is invalid
      throw new Error('Invalid response format from OpenAI');
    },
    
    parseStreamingResponse: (response: ProviderResponse): string => {
      try {
        return response.choices?.[0]?.delta?.content || '';
      } catch (e) {
        console.error('Error parsing OpenAI response:', e);
        return '';
      }
    }
  },
  
  anthropic: {
    parseResponse: (response: ProviderResponse): string => {
      if (response.content && Array.isArray(response.content) && response.content.length > 0 && 'text' in response.content[0]) {
        return response.content[0].text;
      }
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
    }
  }
};

// Create provider implementations using configuration data and strategies
export const providers: Record<ProviderKey, AIProviderInterface> = {
  openai: {
    id: 'openai',
    name: PROVIDER_CONFIGS.openai.name,
    endpoints: PROVIDER_CONFIGS.openai.endpoints,
    models: PROVIDER_CONFIGS.openai.models.map(m => m.id),
    formatRequest: requestFormatterStrategies.openai,
    parseResponse: responseParserStrategies.openai.parseResponse,
    parseStreamingResponse: responseParserStrategies.openai.parseStreamingResponse,
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
          formattedRequest,
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
    formatRequest: requestFormatterStrategies.anthropic,
    parseResponse: responseParserStrategies.anthropic.parseResponse,
    parseStreamingResponse: responseParserStrategies.anthropic.parseStreamingResponse,
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
          formattedRequest,
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