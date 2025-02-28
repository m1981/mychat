import { ModelRegistry } from '@config/models/model.registry';
import { ProviderModel } from '@config/providers/provider.config';
import { ProviderRegistry } from '@config/providers/provider.registry';
import { MessageInterface, ProviderKey } from '@type/chat';
import { AIProvider, RequestConfig } from '@type/provider';

export const providers: Record<ProviderKey, AIProvider> = {
  openai: {
    id: 'openai',
    name: ProviderRegistry.getProvider('openai').name,
    endpoints: ProviderRegistry.getProvider('openai').endpoints,
    models: ProviderRegistry.getProvider('openai').models.map((m: ProviderModel) => m.id),
    formatRequest: (messages: MessageInterface[], config: RequestConfig) => ({
      messages,
      model: config.model,
      max_tokens: ModelRegistry.getModelCapabilities(config.model).maxResponseTokens,
      temperature: config.temperature,
      presence_penalty: config.presence_penalty,
      top_p: config.top_p,
      frequency_penalty: config.frequency_penalty,
      stream: config.stream,
    }),
    parseResponse: (response) => response.choices[0].message.content,
        parseStreamingResponse: (chunk) => {
      if (!chunk?.choices?.[0]?.delta?.content) return '';
      return chunk.choices[0].delta.content;
    },
  },
  anthropic: {
    id: 'anthropic',
    name: ProviderRegistry.getProvider('anthropic').name,
    endpoints: ProviderRegistry.getProvider('anthropic').endpoints,
    models: ProviderRegistry.getProvider('anthropic').models.map((m: ProviderModel) => m.id),
    formatRequest: (messages: MessageInterface[], config: RequestConfig) => ({
      messages: messages.map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      })),
      model: config.model,
      max_tokens: config.max_tokens,
      temperature: config.temperature,
      stream: config.stream,
      thinking: config.enableThinking ? {
        type: 'enabled',
        budget_tokens: Math.floor(config.max_tokens * 0.8) // 80% of max_tokens for thinking
      } : undefined
    }),
    parseResponse: (response) => {
      // Handle non-streaming response
      if (response.content && Array.isArray(response.content)) {
        return response.content[0].text;
      }
      return '';
    },

parseStreamingResponse: (chunk) => {
    // Handle content block delta events
    if (chunk.type === 'content_block_delta' &&
        chunk.delta?.type === 'text_delta' &&
        typeof chunk.delta.text === 'string') {
      return chunk.delta.text;
    }

  return '';
 },
  },
};
