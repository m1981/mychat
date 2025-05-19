import { ProviderKey } from '@type/chat';
import { AIProviderInterface } from '@type/provider';
import { ProviderRegistry } from '@config/providers/provider.registry';
import useStore from '@store/store';

// Implementation of provider interfaces
export const providers: Record<ProviderKey, AIProviderInterface> = {
  openai: {
    formatRequest: (config, messages) => {
      // Use provider config from registry for consistency
      const providerConfig = ProviderRegistry.getProvider('openai');
      
      return {
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        model: config.model,
        max_tokens: config.max_tokens,
        temperature: config.temperature,
        top_p: config.top_p,
        stream: config.stream || false
      };
    },
    parseResponse: (response) => {
      return response;
    },
    submitCompletion: async (formattedRequest) => {
      const apiKey = useStore.getState().apiKeys.openai;
      const endpoints = ProviderRegistry.getProvider('openai').endpoints;
      const endpoint = endpoints[0].startsWith('http') ? endpoints[0] : `https://api.openai.com/v1/chat/completions`;
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(formattedRequest)
      });
      
      return await response.json();
    },
    submitStream: async (formattedRequest) => {
      const apiKey = useStore.getState().apiKeys.openai;
      const endpoints = ProviderRegistry.getProvider('openai').endpoints;
      const endpoint = endpoints[0].startsWith('http') ? endpoints[0] : `https://api.openai.com/v1/chat/completions`;
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({...formattedRequest, stream: true})
      });
      
      return response.body;
    }
  },
  anthropic: {
    formatRequest: (config, messages) => {
      // Use provider config from registry for consistency
      const providerConfig = ProviderRegistry.getProvider('anthropic');
      
      // Format messages for Anthropic API
      const formattedMessages = messages.map(msg => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content
      }));
      
      return {
        messages: formattedMessages,
        model: config.model,
        max_tokens: config.max_tokens,
        temperature: config.temperature,
        top_p: config.top_p,
        stream: config.stream || false
      };
    },
    parseResponse: (response) => {
      return response;
    },
    submitCompletion: async (formattedRequest) => {
      const apiKey = useStore.getState().apiKeys.anthropic;
      const endpoints = ProviderRegistry.getProvider('anthropic').endpoints;
      const endpoint = endpoints[0].startsWith('http') ? endpoints[0] : `https://api.anthropic.com/v1/messages`;
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify(formattedRequest)
      });
      
      return await response.json();
    },
    submitStream: async (formattedRequest) => {
      const apiKey = useStore.getState().apiKeys.anthropic;
      const endpoints = ProviderRegistry.getProvider('anthropic').endpoints;
      const endpoint = endpoints[0].startsWith('http') ? endpoints[0] : `https://api.anthropic.com/v1/messages`;
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({...formattedRequest, stream: true})
      });
      
      return response.body;
    }
  }
};