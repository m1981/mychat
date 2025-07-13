import { FormattedRequest, ProviderKey, ProviderResponse } from '../../types/provider';
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
    // Always use the browser adapter in client-side code
    // This prevents any attempt to load Node.js modules in the browser
    if (typeof window !== 'undefined') {
      return new BrowserClientAdapter(provider, apiKey, requestId);
    }
    
    // Server-side code path - only executed in Node.js
    // We use dynamic require() to prevent static analysis from including these in the bundle
    try {
      if (provider === 'openai') {
        // Using dynamic require to avoid bundling
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { OpenAIClientAdapter } = require('./openai-client');
        return new OpenAIClientAdapter(apiKey, requestId);
      } else if (provider === 'anthropic') {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
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
