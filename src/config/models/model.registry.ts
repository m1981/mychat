// src/config/models/model.registry.ts
import { ModelCapabilities } from '@type/model';
import { ProviderKey } from '@type/chat';

export class ModelRegistry {
  private static modelCapabilities: Map<string, ModelCapabilities> = new Map([
    ['claude-3-5-sonnet-20241022', {
      modelId: 'claude-3-5-sonnet-20241022',
      provider: 'anthropic',
      contextWindow: 200000,
      maxResponseTokens: 8192,  // Corrected from previous value
      defaultResponseTokens: 1024
    }],
    ['gpt-4o', {
      modelId: 'gpt-4o',
      provider: 'openai',
      contextWindow: 127000,  // Slightly reduced for safety
      maxResponseTokens: 4096,
      defaultResponseTokens: 1024
    }]
  ]);

  static getModelCapabilities(modelId: string): ModelCapabilities {
    const capabilities = this.modelCapabilities.get(modelId);
    if (!capabilities) {
      throw new Error(`Model ${modelId} not found in registry`);
    }
    return capabilities;
  }

  static validateResponseTokens(modelId: string, requestedTokens?: number): number {
    const capabilities = this.getModelCapabilities(modelId);
    if (!requestedTokens) {
      return capabilities.defaultResponseTokens;
    }
    return Math.min(requestedTokens, capabilities.maxResponseTokens);
  }

  static getModelsForProvider(provider: ProviderKey): string[] {
    return Array.from(this.modelCapabilities.entries())
      .filter(([_, caps]) => caps.provider === provider)
      .map(([modelId]) => modelId);
  }

  static validateModelForProvider(provider: ProviderKey, modelId: string): boolean {
    const capabilities = this.modelCapabilities.get(modelId);
    return capabilities?.provider === provider;
  }

  static isModelSupported(modelId: string): boolean {
    return this.modelCapabilities.has(modelId);
  }
}
