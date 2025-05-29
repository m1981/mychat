import { ModelCapabilities } from '../types/model.types';
import { ProviderKey } from '../types/provider.types';
import { MODEL_CAPABILITIES } from './defaults';

export class ModelRegistry {
  /**
   * Get model capabilities by model ID
   */
  static getModelCapabilities(modelId: string): ModelCapabilities {
    const capabilities = MODEL_CAPABILITIES.get(modelId);
    if (!capabilities) {
      throw new Error(`Model ${modelId} not found in registry`);
    }
    return capabilities;
  }

  /**
   * Validate if response tokens are within model limits
   */
  static validateResponseTokens(modelId: string, tokens: number): boolean {
    const capabilities = this.getModelCapabilities(modelId);
    return tokens <= capabilities.maxResponseTokens;
  }

  /**
   * Get all models for a specific provider
   */
  static getModelsForProvider(provider: ProviderKey): ModelCapabilities[] {
    return Array.from(MODEL_CAPABILITIES.values())
      .filter(model => model.provider === provider);
  }
}