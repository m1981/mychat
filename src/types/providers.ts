
import { ModelRegistry } from '@config/models/model.registry';
import { ProviderModel } from '@config/providers/provider.config';
import { ProviderRegistry } from '@config/providers/provider.registry';
import { MessageInterface, ProviderKey } from '@type/chat';
import { AIProvider, ProviderResponse, RequestConfig, FormattedRequest } from '@type/provider';

export const providers: Record<ProviderKey, AIProvider> = {
  openai: {
    id: 'openai',
    name: ProviderRegistry.getProvider('openai').name,
    endpoints: ProviderRegistry.getProvider('openai').endpoints,
    models: ProviderRegistry.getProvider('openai').models.map((m: ProviderModel) => m.id),
    formatRequest: (messages: MessageInterface[], config: RequestConfig): FormattedRequest => {
      const formattedRequest = {
        messages: messages
          // Filter out empty messages
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
  },
  anthropic: {
    id: 'anthropic',
    name: ProviderRegistry.getProvider('anthropic').name,
    endpoints: ProviderRegistry.getProvider('anthropic').endpoints,
    models: ProviderRegistry.getProvider('anthropic').models.map((m: ProviderModel) => m.id),
    formatRequest: (messages: MessageInterface[], config: RequestConfig): FormattedRequest => {
      // Extract system message if present
      const systemMessage = messages.find(m => m.role === 'system');
      
      // Filter out system messages and empty messages for the regular message array
      const regularMessages = messages
        .filter(m => m.role !== 'system')
        // Filter out messages with empty content
        .filter(m => m.content.trim() !== '')
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
        thinking: config.enableThinking ? {
          type: "enabled" as const, // Use a literal type with 'as const'
          budget_tokens: config.thinkingConfig.budget_tokens
        } : undefined,
        // Add system parameter if system message exists
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
  },
};