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
    parseResponse: (response) => response.choices[0].message.content,
    parseTitleResponse: (response: any) => {
      // Validate response structure
      if (!response?.choices?.[0]?.message?.content) {
        console.warn('OpenAI title response missing expected structure:', response);
        return 'Untitled Chat';
      }
      
      const title = response.choices[0].message.content.trim();
      // Ensure title is not empty after trimming
      if (!title) {
        return 'Untitled Chat';
      }
      
      // Remove surrounding quotes and limit length
      return title
        .replace(/^["'](.+)["']$/, '$1')
        .slice(0, 100); // Prevent extremely long titles
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
      if (response.content && Array.isArray(response.content)) {
        return response.content[0].text;
      }
      return '';
    },
    parseTitleResponse: (response: any) => {
      // Validate response structure
      if (!response?.content?.[0]?.text) {
        console.warn('Anthropic title response missing expected structure:', response);
        return 'Untitled Chat';
      }
      
      const title = response.content[0].text.trim();
      // Ensure title is not empty after trimming
      if (!title) {
        return 'Untitled Chat';
      }
      
      // Remove surrounding quotes and limit length
      return title
        .replace(/^["'](.+)["']$/, '$1')
        .slice(0, 100); // Prevent extremely long titles
    },
    parseStreamingResponse: (response: any) => {
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
  },
};