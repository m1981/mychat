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
  static async createClient(provider: ProviderKey, apiKey: string, requestId?: string) {
    // Skip SDK loading on client-side
    if (typeof window !== 'undefined') {
      // Return a client-side adapter that uses fetch to call your API
      return new BrowserClientAdapter(provider, apiKey, requestId);
    }
    
    // Server-side: dynamically import the appropriate adapter
    switch (provider) {
      case 'anthropic':
        const { AnthropicClientAdapter } = await import('./anthropic-client');
        return new AnthropicClientAdapter(apiKey, requestId);
      case 'openai':
        const { OpenAIClientAdapter } = await import('./openai-client');
        return new OpenAIClientAdapter(apiKey, requestId);
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }
}

// Simple adapter for browser environments that calls your API
class BrowserClientAdapter implements ProviderClientAdapter {
  constructor(private provider: ProviderKey, private apiKey: string, private requestId?: string) {}
  
  async createCompletion(formattedRequest: FormattedRequest): Promise<ProviderResponse> {
    const response = await fetch(`/api/chat/${this.provider}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ formattedRequest, apiKey: this.apiKey })
    });
    
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return await response.json();
  }
  
  async createStreamingCompletion(formattedRequest: FormattedRequest): Promise<ReadableStream> {
    const response = await fetch(`/api/chat/${this.provider}/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ formattedRequest, apiKey: this.apiKey })
    });
    
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return response.body!;
  }
}
