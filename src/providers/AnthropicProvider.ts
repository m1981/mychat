import { AIProviderBase, ProviderKey, ProviderCapabilities, MessageInterface, RequestConfig, FormattedRequest, ProviderResponse } from '@type/provider';
import { PROVIDER_CONFIGS } from '@config/providers/provider.config';
import store from '@store/store';

export class AnthropicProvider implements AIProviderBase {
  id: ProviderKey;
  name: string;
  endpoints: string[];
  models: string[];
  capabilities: ProviderCapabilities;

  constructor() {
    // Get configuration from provider config
    const config = PROVIDER_CONFIGS.anthropic;
    
    this.id = 'anthropic';
    this.name = config.name;
    this.endpoints = config.endpoints;
    this.models = config.models.map(m => m.id);
    this.capabilities = {
      supportsThinking: config.capabilities.supportsThinking,
      maxCompletionTokens: config.models[0].maxCompletionTokens,
      defaultModel: config.defaultModel,
      defaultThinkingModel: config.defaultModel
    };
  }

  formatRequest(messages: MessageInterface[], config: RequestConfig): FormattedRequest {
    // Extract system message if present
    const systemMessage = messages.find(m => m.role === 'system');
    
    // Filter out system messages and empty messages for the regular message array
    const regularMessages = messages
      .filter(m => m.role !== 'system')
      .filter(m => m.content.trim() !== '')
      .map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
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
    
    // Add thinking configuration if enabled
    if (config.thinking?.enabled || config.thinking_mode?.enabled) {
      formattedRequest.thinking = {
        type: "enabled",
        budget_tokens: (config.thinking?.budget_tokens || config.thinking_mode?.budget_tokens || 16000)
      };
    }
    
    return formattedRequest;
  }

  parseResponse(response: unknown): string {
    // Validate response
    if (!response) return '';
    
    // Handle non-streaming response
    if (response.content && Array.isArray(response.content) && response.content.length > 0) {
      return response.content[0].text;
    }
    
    // If content is a string, return it (for test compatibility)
    if (typeof response.content === 'string') {
      return response.content;
    }
    
    return '';
  }

  parseStreamingResponse(response: unknown): string {
    try {
      // Validate response
      if (!response) return '';
      
      if (response.type === 'content_block_delta') {
        return response.delta?.text || '';
      }
      return '';
    } catch (e) {
      console.error('Error parsing Anthropic response:', e);
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
        model: formattedRequest.model,
        max_tokens: formattedRequest.max_tokens,
        temperature: formattedRequest.temperature,
        top_p: formattedRequest.top_p,
        messages: formattedRequest.messages,
        system: formattedRequest.system,
        thinking: formattedRequest.thinking,
        apiKey
      })
    });
    
    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status}`);
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
        formattedRequest: {
          ...formattedRequest,
          stream: true
        },
        apiKey
      })
    });
    
    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status}`);
    }
    
    return response.body as ReadableStream;
  }

  // Private helper methods
  private getApiKey(): string {
    // Get API key from store or environment
    return store.getState().apiKeys.anthropic;
  }
  
  private formatEndpoint(endpoint: string): string {
    // Format endpoint URL
    if (endpoint.startsWith('http')) {
      return endpoint;
    }
    return `${window.location.origin}${endpoint}`;
  }
  
  // Helper method to validate response
  private validateResponse(response: unknown): void {
    if (!response) {
      throw new Error('Empty response from Anthropic');
    }
  }
}