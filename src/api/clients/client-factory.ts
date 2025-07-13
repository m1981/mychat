import { AnthropicClientAdapter } from './anthropic-client';
import { OpenAIClientAdapter } from './openai-client';
import { ProviderClientAdapter } from './provider-client-adapter';
import { ProviderKey } from '../../types/provider';

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
    if (!apiKey) {
      throw new Error(`API key is required for ${provider}`);
    }
    
    switch (provider) {
      case 'anthropic':
        return new AnthropicClientAdapter(apiKey, requestId);
      case 'openai':
        return new OpenAIClientAdapter(apiKey, requestId);
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }
}