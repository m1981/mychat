import { AIProviderBase, ProviderKey, ProviderCapabilities, MessageInterface, RequestConfig, FormattedRequest, ProviderResponse } from '@type/provider';
import { PROVIDER_CONFIGS } from '@config/providers/provider.config';
import store from '@store/store';

export class AnthropicProvider extends AIProviderBase {
  constructor() {
    // Get configuration from provider config
    const config = PROVIDER_CONFIGS.anthropic;
    const capabilities: ProviderCapabilities = {
      supportsThinking: config.capabilities.supportsThinking,
      maxCompletionTokens: config.models[0].maxCompletionTokens,
      defaultModel: config.defaultModel,
      defaultThinkingModel: config.defaultModel
    };
    
    super(
      'anthropic',
      config.name,
      config.endpoints,
      config.models.map(m => m.id),
      capabilities
    );
  }

  formatRequest(messages: ReadonlyArray<MessageInterface>, config: Readonly<RequestConfig>): FormattedRequest {
    // Filter out empty messages first
    const filteredMessages = messages.filter(msg => msg.content && msg.content.trim() !== '');
    
    // Extract system message if present
    const systemMessage = filteredMessages.find(m => m.role === 'system');
    
    // Format regular messages for Anthropic
    const regularMessages = filteredMessages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content
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
    // Validate response using the protected helper method
    this.validateResponse(response);
    
    // Handle non-streaming response
    if (response.content && Array.isArray(response.content) && response.content.length > 0) {
      return response.content[0].text;
    }
    
    // If content is a string, return it (for test compatibility)
    if (typeof response.content === 'string') {
      return response.content;
    }
    
    throw new Error('Invalid response format from Anthropic');
  }

  parseStreamingResponse(response: unknown): string {
    try {
      // Validate response
      this.validateResponse(response);
      
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
    return endpoint.startsWith('http') 
      ? endpoint 
      : endpoint.startsWith('/api') 
        ? endpoint 
        : `/api${endpoint}`;
  }
}