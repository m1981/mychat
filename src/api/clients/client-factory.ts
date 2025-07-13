import { ProviderKey } from '../../types/provider';

import { ProviderClientAdapter } from './provider-client-adapter';

/**
 * Factory for creating provider-specific client adapters
 */
export class ProviderClientFactory {
  /**
   * Create a client adapter for the specified provider
   * @param provider The provider key
   * @param apiKey The API key for the provider
   * @param requestId Optional request ID for tracking
   * @returns A client adapter instance
   */
  static createClient(provider: ProviderKey, apiKey: string, requestId?: string): ProviderClientAdapter {
    // Check if we're running in a browser environment
    const isBrowser = typeof window !== 'undefined';
    
    if (isBrowser) {
      // In browser, return a fetch-based adapter
      return new BrowserClientAdapter(provider, apiKey, requestId);
    }
    
    // In Node.js environment, dynamically require the appropriate adapter
    // This code will never be included in the browser bundle
    try {
      if (provider === 'openai') {
        // Using require instead of import to avoid bundling
        const { OpenAIClientAdapter } = require('./openai-client');
        return new OpenAIClientAdapter(apiKey, requestId);
      } else if (provider === 'anthropic') {
        const { AnthropicClientAdapter } = require('./anthropic-client');
        return new AnthropicClientAdapter(apiKey, requestId);
      }
    } catch (error) {
      console.error(`Failed to load ${provider} adapter:`, error);
      throw new Error(`Provider ${provider} is not supported in this environment`);
    }
    
    throw new Error(`Unsupported provider: ${provider}`);
  }
}

// Browser-specific adapter implementation
class BrowserClientAdapter implements ProviderClientAdapter {
  constructor(
    private provider: ProviderKey,
    private apiKey: string,
    private requestId?: string
  ) {}
  
  async createCompletion(formattedRequest: FormattedRequest): Promise<ProviderResponse> {
    const response = await fetch(`/api/chat/${this.provider}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': this.requestId || ''
      },
      body: JSON.stringify({
        formattedRequest,
        apiKey: this.apiKey
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error (${response.status}): ${errorText}`);
    }
    
    return await response.json();
  }
  
  async createStreamingCompletion(formattedRequest: FormattedRequest): Promise<ReadableStream> {
    const response = await fetch(`/api/chat/${this.provider}/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': this.requestId || ''
      },
      body: JSON.stringify({
        formattedRequest,
        apiKey: this.apiKey
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error (${response.status}): ${errorText}`);
    }
    
    return response.body!;
  }
}
