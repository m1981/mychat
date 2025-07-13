// src/config/models/model.registry.ts
import { ModelCapabilities } from '@type/model';
import { ProviderKey } from '@type/provider';
import { debug } from '@utils/debug';

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
    debug.log('models', `Getting capabilities for model: "${modelId}"`);
    
    if (!modelId) {
      debug.error('models', `Invalid model ID: ${modelId}`);
      throw new Error(`Model ${modelId} not found in registry`);
    }
    
    const capabilities = this.modelCapabilities.get(modelId);
    if (!capabilities) {
      debug.error('models', `Model "${modelId}" not found in registry`);
      debug.log('models', `Available models: ${Array.from(this.modelCapabilities.keys()).join(', ')}`);
      throw new Error(`Model ${modelId} not found in registry`);
    }
    
    debug.log('models', `Found capabilities for model "${modelId}": ${JSON.stringify(capabilities)}`);
    return capabilities;
  }

  static validateResponseTokens(modelId: string, requestedTokens?: number): number {
    debug.log('models', `Validating response tokens: modelId="${modelId}", requestedTokens=${requestedTokens}`);
    
    try {
      const capabilities = this.getModelCapabilities(modelId);
      if (!requestedTokens) {
        debug.log('models', `No tokens requested, using default: ${capabilities.defaultResponseTokens}`);
        return capabilities.defaultResponseTokens;
      }
      
      const validatedTokens = Math.min(requestedTokens, capabilities.maxResponseTokens);
      debug.log('models', `Validated tokens: ${validatedTokens} (requested: ${requestedTokens}, max: ${capabilities.maxResponseTokens})`);
      return validatedTokens;
    } catch (error) {
      debug.error('models', `Error validating response tokens: ${error.message}`);
      return requestedTokens || 4096; // Safe default
    }
  }

  static getModelsForProvider(provider: ProviderKey): string[] {
    debug.log('models', `Getting models for provider: "${provider}"`);
    
    const models = Array.from(this.modelCapabilities.entries())
      .filter(([_, caps]) => caps.provider === provider)
      .map(([modelId]) => modelId);
      
    debug.log('models', `Found ${models.length} models for provider "${provider}": ${models.join(', ')}`);
    return models;
  }

  static validateModelForProvider(provider: ProviderKey, modelId: string): boolean {
    debug.log('models', `Validating model "${modelId}" for provider "${provider}"`);
    
    try {
      const capabilities = this.modelCapabilities.get(modelId);
      const isValid = capabilities?.provider === provider;
      debug.log('models', `Model "${modelId}" ${isValid ? 'is' : 'is not'} valid for provider "${provider}"`);
      return isValid;
    } catch (error) {
      debug.error('models', `Error validating model for provider: ${error.message}`);
      return false;
    }
  }

  static isModelSupported(modelId: string): boolean {
    debug.log('models', `Checking if model "${modelId}" is supported`);
    const isSupported = this.modelCapabilities.has(modelId);
    debug.log('models', `Model "${modelId}" is ${isSupported ? 'supported' : 'not supported'}`);
    return isSupported;
  }
}