
import { ProviderKey, MessageInterface, RequestConfig, FormattedRequest, ProviderResponse, AIProviderInterface } from '@type/provider';
import { PROVIDER_CONFIGS } from '@config/providers/provider.config';
import store from '@store/store';

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
          stream: config.stream ?? false,
          messages: []
        };
      }

      // Format the request according to OpenAI's API
      return {
        model: config.model,
        max_tokens: config.max_tokens,
        temperature: config.temperature,
        top_p: config.top_p,
        presence_penalty: config.presence_penalty,
        frequency_penalty: config.frequency_penalty,
        stream: config.stream ?? false,
        messages: messages
          .filter(msg => msg.content && msg.content.trim() !== '')
          .map(msg => ({
            role: msg.role,
            content: msg.content
          }))
      };
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
        // Log the incoming response for debugging
        console.log('OpenAI streaming response received:', JSON.stringify(response));
        
        // Handle both direct delta content and nested delta content
        if (response.choices?.[0]?.delta?.content !== undefined) {
          return response.choices[0].delta.content;
        }
        
        // Handle case where content might be directly on the response
        if (typeof response.content === 'string') {
          return response.content;
        }
        
        // Handle case where the entire response might be a string
        if (typeof response === 'string') {
          try {
            const parsed = JSON.parse(response);
            if (parsed.choices?.[0]?.delta?.content !== undefined) {
              return parsed.choices[0].delta.content;
            }
          } catch (e) {
            // Not JSON, return empty string
            console.error('Failed to parse string response:', e);
            return '';
          }
        }
        
        // Log unhandled response formats
        console.warn('Unhandled response format in parseStreamingResponse:', JSON.stringify(response));
        return '';
      } catch (e) {
        console.error('Error parsing OpenAI response:', e, 'Response:', JSON.stringify(response));
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
          // Don't wrap in formattedRequest property for middleware mode
          // Instead, send the parameters directly
          messages: formattedRequest.messages,
          config: {
            model: formattedRequest.model,
            max_tokens: formattedRequest.max_tokens,
            temperature: formattedRequest.temperature,
            top_p: formattedRequest.top_p,
            presence_penalty: formattedRequest.presence_penalty,
            frequency_penalty: formattedRequest.frequency_penalty,
            stream: formattedRequest.stream
          },
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
      
      console.log('Submitting OpenAI stream request to:', apiEndpoint);
      
      // Send a properly formatted request with stream: true
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // Send all parameters at the top level for consistency with server expectations
          model: formattedRequest.model,
          max_tokens: formattedRequest.max_tokens,
          temperature: formattedRequest.temperature,
          top_p: formattedRequest.top_p,
          presence_penalty: formattedRequest.presence_penalty,
          frequency_penalty: formattedRequest.frequency_penalty,
          stream: true,  // Always true for streaming
          messages: formattedRequest.messages,
          apiKey
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenAI API error response:', errorText);
        throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
      }
      
      console.log('Stream response received, returning body');
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
          stream: config.stream ?? false,
          messages: []
        };
      }
      
      // Filter out empty messages first
      const filteredMessages = messages.filter(msg => msg.content && msg.content.trim() !== '');
      
      // Extract system message if present
      const systemMessage = filteredMessages.find(m => m.role === 'system');
      
      // Format regular messages for Anthropic
      const regularMessages = filteredMessages
        .filter(m => m.role !== 'system')
        .map(m => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content
        }));
      
      // Create formatted request
      const formattedRequest: FormattedRequest = {
        model: config.model,
        max_tokens: config.max_tokens,
        temperature: config.temperature,
        top_p: config.top_p,
        stream: config.stream ?? false,
        messages: regularMessages
      };
      
      // Add system message if present
      if (systemMessage) {
        formattedRequest.system = systemMessage.content;
      }
      
      // Add thinking configuration if enabled - check both properties
      if (config.thinking?.enabled || config.thinking_mode?.enabled) {
        formattedRequest.thinking = {
          type: "enabled",
          budget_tokens: (config.thinking?.budget_tokens || config.thinking_mode?.budget_tokens || 16000)
        };
      }
      
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
      
      // Send the request directly to the API
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: formattedRequest.model,
          max_tokens: formattedRequest.max_tokens,
          temperature: formattedRequest.temperature,
          top_p: formattedRequest.top_p,
          messages: formattedRequest.messages,
          system: formattedRequest.system,
          apiKey: apiKey
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
        },
        body: JSON.stringify({
          // Wrap in formattedRequest property
          formattedRequest: {
            ...formattedRequest,
            stream: true
          },
          // Add API key separately
          apiKey
        })
      });
      
      if (!response.ok) {
        throw new Error(`Anthropic API error: ${response.status}`);
      }
      
      return response.body as ReadableStream;
    }
  },
};

// Add a factory function to create provider implementation instances
export  function getProviderImplementation(key: ProviderKey): AIProviderInterface {
  const provider = providers[key];
  if (!provider) {
    throw new Error(`Provider implementation for ${key} not found`);
  }
  return provider;
}
