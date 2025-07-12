import { PROVIDER_CONFIGS } from '@config/providers/provider.config';
import store from '@store/store';
import { AIProviderBase, ProviderKey, ProviderCapabilities, MessageInterface, RequestConfig, FormattedRequest, ProviderResponse } from '@type/provider';

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
    const apiKey = this.getApiKey();
    const endpoint = this.endpoints[0];
    
    const apiEndpoint = this.formatEndpoint(endpoint);
    
    // Send the request directly to the API
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...formattedRequest,
        apiKey
      })
    });
    
    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }
    
    return await response.json();
  }

  async submitStream(formattedRequest: Readonly<FormattedRequest>): Promise<ReadableStream> {
    const apiKey = this.getApiKey();
    const endpoint = this.endpoints[0];
    
    const apiEndpoint = this.formatEndpoint(endpoint);
    
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...formattedRequest,
        stream: true,
        apiKey
      })
    });
    
    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }
    
    return response.body as ReadableStream;
  }

  // Private helper methods
  private getApiKey(): string {
    // Get API key from store or environment
    return store.getState().apiKeys.openai;
  }
  
  private formatEndpoint(endpoint: string): string {
    // Format endpoint URL
    if (endpoint.startsWith('http')) {
      return endpoint;
    }
    return `${window.location.origin}${endpoint}`;
  }
}
