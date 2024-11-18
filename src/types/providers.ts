import { AIProvider, RequestConfig } from '@type/provider';
import { MessageInterface, ProviderKey } from '@type/chat';
import { officialAPIEndpoint } from './../constants/auth';

export const providers: Record<ProviderKey, AIProvider> = {
  openai: {
    id: 'openai',
    name: 'OpenAI',
    endpoints: [officialAPIEndpoint],
    models: ['gpt-4o'],
    maxTokens: {
      'gpt-4o': 8192,
    },
    costs: {
      'gpt-4o': { price: 0.01, unit: 1000 },
    },
    formatRequest: (messages: MessageInterface[], config: RequestConfig) => ({
      messages,
      model: config.model,
      max_tokens: config.max_tokens,
      temperature: config.temperature,
      presence_penalty: config.presence_penalty,
      top_p: config.top_p,
      frequency_penalty: config.frequency_penalty,
      stream: config.stream,
    }),
    parseResponse: (response) => response.choices[0].message.content,
        parseStreamingResponse: (chunk) => {
      // Add defensive checking
      if (!chunk?.choices?.[0]?.delta?.content) {
        return '';
      }
      return chunk.choices[0].delta.content;
    },
  },
  anthropic: {
    id: 'anthropic',
    name: 'Anthropic',
    endpoints: ['https://api.anthropic.com/v1/messages'],
    models: ['claude-3-5-sonnet-20241022'],
    maxTokens: {
      'claude-3-5-sonnet-20241022': 100000,
    },
    costs: {
      'claude-3-5-sonnet-20241022': { price: 0.01, unit: 1000 },
    },
    formatRequest: (messages: MessageInterface[], config: RequestConfig) => ({
      messages: messages.map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      })),
      model: config.model,
      max_tokens: config.max_tokens,
      temperature: config.temperature,
      stream: config.stream,
    }),
    parseResponse: (response) => {
      // Handle non-streaming response
      if (response.content && Array.isArray(response.content)) {
        return response.content[0].text;
      }
      return '';
    },
    parseStreamingResponse: (chunk) => {
      console.log('Parsing streaming chunk:', chunk); // Add this for debugging

      // Handle different event types from Anthropic's streaming response
      if (chunk.type === 'message') {
        return chunk.content?.[0]?.text || '';
      }
      if (chunk.type === 'content_block_delta' && chunk.delta?.type === 'text_delta') {
        return chunk.delta.text;
      }
      return '';
    },
  },
};
