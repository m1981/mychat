import { OpenAIClientAdapter } from '@api/clients/openai-client';
import { PROVIDER_CONFIGS } from '@config/providers/provider.config';
import useStore from '@store/store';
import { AIProviderBase, ProviderKey, ProviderCapabilities, MessageInterface, RequestConfig, FormattedRequest, ProviderResponse } from '@type/provider';
import { getApiKey } from '@utils/auth';
import { debug } from '@utils/debug';

export class OpenAIProvider implements AIProviderBase {
  id: ProviderKey;
  name: string;
  endpoints: string[];
  models: string[];
  capabilities: ProviderCapabilities;

  constructor() {
    // Get configuration from provider config
    const config = PROVIDER_CONFIGS.openai;
    
    this.id = 'openai';
    this.name = config.name;
    this.endpoints = config.endpoints;
    this.models = config.models.map(m => m.id);
    this.capabilities = {
      supportsThinking: config.capabilities.supportsThinking,
      maxCompletionTokens: config.models[0].maxCompletionTokens,
      defaultModel: config.defaultModel
    };
  }

  formatRequest(messages: MessageInterface[], config: RequestConfig): FormattedRequest {
    // Filter out empty messages
    const filteredMessages = messages
      .filter(m => m.content.trim() !== '')
      .map(m => ({
        role: m.role,
        content: m.content
      }));
    
    // Create formatted request
    const formattedRequest: FormattedRequest = {
      model: config.model,
      max_tokens: config.max_tokens,
      temperature: config.temperature,
      top_p: config.top_p,
      presence_penalty: config.presence_penalty,
      frequency_penalty: config.frequency_penalty,
      stream: config.stream ?? false,
      messages: filteredMessages
    };
    
    return formattedRequest;
  }

  parseResponse(response: unknown): string {
    // Validate response
    if (!response) return '';
    
    // Handle direct content (for test compatibility)
    if (response.content) {
      return response.content;
    }
    
    // Handle standard OpenAI response format
    if (response.choices && response.choices[0].message) {
      return response.choices[0].message.content;
    }
    
    throw new Error('Invalid response format from OpenAI');
  }

  parseStreamingResponse(response: unknown): string {
    try {
      // Validate response
      if (!response) return '';
      
      if (response.choices && response.choices[0].delta) {
        return response.choices[0].delta.content || '';
      }
      return '';
    } catch (e) {
      console.error('Error parsing OpenAI response:', e);
      return '';
    }
  }

  async submitCompletion(formattedRequest: Readonly<FormattedRequest>): Promise<ProviderResponse> {
    // Get API key from store first
    const storeApiKeys = useStore.getState().apiKeys;
    const apiKey = storeApiKeys[this.id] || getApiKey(this.id);
    
    if (!apiKey) {
      debug.error('provider', `No API key found for ${this.id}`);
      throw new Error(`No API key found for ${this.id}`);
    }
    
    debug.log('provider', `Submitting completion with API key: ${apiKey ? 'present' : 'missing'}`);
    const client = new OpenAIClientAdapter(apiKey);
    return await client.createCompletion(formattedRequest);
  }

  async submitStream(formattedRequest: Readonly<FormattedRequest>): Promise<ReadableStream> {
    const apiKey = getApiKey(this.id);
    if (!apiKey) throw new Error(`No API key found for ${this.id}`);
    
    const client = new OpenAIClientAdapter(apiKey);
    return await client.createStreamingCompletion(formattedRequest);
  }
}
