/**
 * Registry System
 * 
 * This module provides access to all application registries.
 * Use this as the single entry point for registry access.
 */

import { ProviderKey, ModelCapabilities, ProviderConfig } from '../types';

// Model Registry
export class ModelRegistry {
  private static modelCapabilities: Map<string, ModelCapabilities> = new Map([
    ['claude-3-7-sonnet-20250219', {
      modelId: 'claude-3-7-sonnet-20250219',
      provider: 'anthropic',
      maxResponseTokens: 8192,
      defaultResponseTokens: 4096,
      supportsThinking: true,
      defaultThinkingBudget: 16000
    }],
    ['gpt-4o', {
      modelId: 'gpt-4o',
      provider: 'openai',
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

  static getModelsForProvider(provider: ProviderKey): string[] {
    return Array.from(this.modelCapabilities.entries())
      .filter(([_, caps]) => caps.provider === provider)
      .map(([modelId]) => modelId);
  }

  static validateModelForProvider(provider: ProviderKey, modelId: string): boolean {
    const capabilities = this.modelCapabilities.get(modelId);
    return capabilities?.provider === provider;
  }
  
  // For backward compatibility with existing code
  static getProvider(modelId: string): ProviderKey {
    return this.getModelCapabilities(modelId).provider;
  }

  static validateResponseTokens(modelId: string, requestedTokens?: number): number {
    const capabilities = this.getModelCapabilities(modelId);
    
    // If no tokens specified, return default
    if (requestedTokens === undefined) {
      return capabilities.defaultResponseTokens;
    }
    
    // Cap tokens at model maximum
    return Math.min(requestedTokens, capabilities.maxResponseTokens);
  }
}

// Provider Registry
export class ProviderRegistry {
  static getProviderCapabilities(provider: ProviderKey) {
    switch (provider) {
      case 'anthropic':
        return {
          supportsThinking: true,
          defaultThinkingModel: 'claude-3-7-sonnet-20250219',
          maxCompletionTokens: 8192,
          defaultModel: 'claude-3-7-sonnet-20250219',
          defaultThinkingBudget: 16000
        };
      case 'openai':
        return {
          supportsThinking: false,
          defaultThinkingModel: undefined,
          maxCompletionTokens: 4096,
          defaultModel: 'gpt-4o',
          defaultThinkingBudget: 0
        };
      default:
        throw new Error(`Provider ${provider} not found`);
    }
  }

  static getDefaultModelForProvider(provider: ProviderKey): string {
    return this.getProviderCapabilities(provider).defaultModel;
  }

  static validateModelForProvider(provider: ProviderKey, modelId: string): boolean {
    return ModelRegistry.validateModelForProvider(provider, modelId);
  }
  
  // For backward compatibility with existing code
  static getProvider(providerId: ProviderKey): ProviderConfig {
    const capabilities = this.getProviderCapabilities(providerId);
    const models = ModelRegistry.getModelsForProvider(providerId);
    
    return {
      id: providerId,
      name: providerId === 'anthropic' ? 'Anthropic' : 'OpenAI',
      models: models.map(id => {
        const capabilities = ModelRegistry.getModelCapabilities(id);
        return { 
          id, 
          name: id,
          maxCompletionTokens: capabilities.maxResponseTokens || 4096, // Ensure this is always a number
          cost: providerId === 'anthropic' ? {
            input: { price: 0.00000163, unit: 1000 },
            output: { price: 0.00000551, unit: 1000 }
          } : {
            input: { price: 0.00000300, unit: 1000 },
            output: { price: 0.00000600, unit: 1000 }
          }
        };
      }),
      endpoints: [],
      capabilities
    };
  }
}