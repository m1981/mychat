import { FormattedRequest, ProviderResponse } from '@type/provider';

/**
 * Base interface for all provider client adapters
 */
export interface ProviderClientAdapter {
  createStreamingCompletion(formattedRequest: FormattedRequest): Promise<ReadableStream>;
  createCompletion(formattedRequest: FormattedRequest): Promise<ProviderResponse>;
}

/**
 * Factory for creating provider client adapters
 */
export class ProviderClientFactory {
  static createClient(provider: string, apiKey: string, requestId?: string): ProviderClientAdapter {
    switch (provider) {
      case 'openai':
        const { OpenAIClientAdapter } = require('./openai-client');
        return new OpenAIClientAdapter(apiKey, requestId);
      case 'anthropic':
        const { AnthropicClientAdapter } = require('./anthropic-client');
        return new AnthropicClientAdapter(apiKey);
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }
}