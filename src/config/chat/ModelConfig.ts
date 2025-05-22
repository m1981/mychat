import { ModelConfig } from '@type/provider';
import { DEFAULT_MODEL_CONFIG } from './ChatConfig';
import { ModelRegistry } from '@config/models/model.registry';

// Re-export DEFAULT_MODEL_CONFIG for backward compatibility
export { DEFAULT_MODEL_CONFIG };

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