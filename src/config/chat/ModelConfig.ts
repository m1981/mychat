import { ModelConfig } from '@type/provider';
import { createDefaultModelConfig } from '../defaults/ModelDefaults';
import { ModelRegistry } from '@config/models/model.registry';

// Create and export DEFAULT_MODEL_CONFIG
export const DEFAULT_MODEL_CONFIG = createDefaultModelConfig();

/**
 * Get model configuration with optional overrides
 * 
 * @param overrides - Optional configuration overrides
 * @returns Model configuration with defaults applied
 */
export function getModelConfig(overrides?: Partial<ModelConfig>): ModelConfig {
  return {
    ...DEFAULT_MODEL_CONFIG,
    ...overrides
  };
}

/**
 * Model capabilities interface
 */
export interface ModelCapabilities {
  /**
   * Maximum number of tokens the model can generate in a response
   */
  maxResponseTokens: number;
  
  /**
   * Whether the model supports thinking mode
   */
  supportsThinking?: boolean;
  
  /**
   * Whether the model supports system prompts
   */
  supportsSystemPrompt?: boolean;
}

/**
 * Get model capabilities for a specific model
 * 
 * @param modelId - Model identifier
 * @returns Model capabilities
 */
export function getModelCapabilities(modelId: string): ModelCapabilities {
  // Use the ModelRegistry as the single source of truth
  return ModelRegistry.getModelCapabilities(modelId);
}

/**
 * Export ModelRegistry for backward compatibility
 */
export const ModelRegistry = {
  getModelCapabilities
};