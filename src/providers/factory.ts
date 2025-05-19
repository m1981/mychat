import { AIProvider } from './interfaces';
import { OpenAIProvider } from './implementations/openai';
import { AnthropicProvider } from './implementations/anthropic';
import { PROVIDER_CONFIGS } from './config';

export class ProviderFactory {
  // Create provider instances on demand with proper DI
  static createProvider(id: string, apiKey: string): AIProvider {
    const config = PROVIDER_CONFIGS[id];
    
    if (!config) {
      throw new Error(`Provider configuration for ${id} not found`);
    }
    
    switch (id) {
      case 'openai':
        return new OpenAIProvider(config, apiKey);
      case 'anthropic':
        return new AnthropicProvider(config, apiKey);
      default:
        throw new Error(`Provider implementation for ${id} not found`);
    }
  }
}