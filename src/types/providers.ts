import { ModelRegistry } from '@config/models/model.registry';
import { ProviderModel } from '@config/providers/provider.config';
import { ProviderRegistry } from '@config/providers/provider.registry';
import { MessageInterface, ProviderKey } from '@type/chat';
import { AIProvider, RequestConfig, FormattedRequest } from '@type/provider';

export const providers: Record<ProviderKey, AIProvider> = {
  openai: {
    id: 'openai',
    name: ProviderRegistry.getProvider('openai').name,
    endpoints: ProviderRegistry.getProvider('openai').endpoints,
    models: ProviderRegistry.getProvider('openai').models.map((m: ProviderModel) => m.id),
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
    parseResponse: (response) => {
      if (!response) return '';
      
      try {
        return response?.choices?.[0]?.message?.content || '';
      } catch (error) {
        console.error('Error parsing OpenAI response:', error);
        return '';
      }
    },
    parseStreamingResponse: (response: any) => {
      try {
        return response.choices?.[0]?.delta?.content || '';
      } catch (e) {
        console.error('Error parsing OpenAI response:', e);
        return '';
      }
    },
  },
  anthropic: {
    id: 'anthropic',
    name: ProviderRegistry.getProvider('anthropic').name,
    endpoints: ProviderRegistry.getProvider('anthropic').endpoints,
    models: ProviderRegistry.getProvider('anthropic').models.map((m: ProviderModel) => m.id),
    formatRequest: (messages: MessageInterface[], config: RequestConfig): FormattedRequest => ({
     model: config.model,
      max_tokens: config.max_tokens,
      temperature: config.temperature,
      top_p: config.top_p,
      stream: config.stream ?? false,
      thinking: config.enableThinking ? {
        type: 'enabled',
        budget_tokens: config.thinkingConfig.budget_tokens
      } : undefined,
      messages: messages.map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      }))
    }),
    parseResponse: (response) => {
      if (!response) return '';
      
      try {
        // Handle Claude 3 array format
        if (Array.isArray(response.content)) {
          const textContent = response.content.find(c => c.type === 'text');
          return textContent?.text || '';
        }
        
        // Handle Claude 2 string format
        if (response?.content && typeof response.content === 'string') {
          return response.content;
        }
        
        console.warn('Unexpected Anthropic response format:', response);
        return '';
      } catch (error) {
        console.error('Error parsing Anthropic response:', error);
        return '';
      }
    },
    parseStreamingResponse: (response: any) => {
      try {
        if (response.type === 'content_block_del' + 'ta') {
          return response.delta?.text || '';
        }
        return '';
      } catch (e) {
        console.error('Error parsing Anthropic response:', e);
        return '';
      }
    },
  },
};