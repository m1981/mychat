import { ModelRegistry } from '../registry';
import { ProviderKey, AIProvider, MessageInterface, RequestConfig, FormattedRequest } from '../types';

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
    formatRequest: (messages: MessageInterface[], config: RequestConfig): FormattedRequest => {
      // Extract system message if the first message appears to be a system instruction
      let systemMessage = '';
      let userMessages = [...messages];
      
      // Check if first message looks like a system instruction
      if (messages.length > 0 && messages[0].role === 'user' && 
          (messages[0].content.includes('You are') ||
           messages[0].content.includes('As an AI') ||
           messages[0].content.includes('helpful assistant'))) {
        systemMessage = messages[0].content;
        userMessages = messages.slice(1);
      }
      
      // Filter out empty assistant messages (typically the last one)
      const filteredMessages = userMessages.filter(msg => 
        !(msg.role === 'assistant' && (msg.content === '' || msg.content === null))
      );
      
      // Format for Anthropic API
      return {
        model: config.model || 'claude-3-7-sonnet-20250219',
        max_tokens: config.max_tokens || 4096,
        temperature: config.temperature || 0.7,
        stream: config.stream || false,
        system: systemMessage,
        messages: filteredMessages.map(msg => ({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: msg.content
        }))
      };
    },
    parseResponse: (_response: any): string => {
      // Implementation
      return '';
    }
  }
};

// Add parseStreamingResponse to AIProvider interface in types/index.ts
