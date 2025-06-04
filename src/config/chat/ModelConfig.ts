import { ModelConfig } from '@type/provider';
import { DEFAULT_MODEL_CONFIG } from './ChatConfig';

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
  // Default capabilities
  const defaultCapabilities: ModelCapabilities = {
    maxResponseTokens: 4000,
    supportsThinking: false,
    supportsSystemPrompt: true
  };
  
  // Normalize model ID by removing version suffix if present
  const normalizedModelId = modelId.replace(/-\d{8}$/, '');
  
  // Model-specific capabilities
  const modelCapabilities: Record<string, Partial<ModelCapabilities>> = {
    'gpt-4o': {
      maxResponseTokens: 4096,
      supportsThinking: false
    },
    'claude-3-7-sonnet': {
      maxResponseTokens: 8192,
      supportsThinking: true
    },
    'claude-3-5-sonnet': {
      maxResponseTokens: 4096,
      supportsThinking: false
    }
  };
  
  // Try to get capabilities for the normalized model ID
  const capabilities = modelCapabilities[normalizedModelId] || modelCapabilities[modelId];
  
  return {
    ...defaultCapabilities,
    ...capabilities
  };
}

/**
 * Export ModelRegistry for backward compatibility
 */
export const ModelRegistry = {
  getModelCapabilities
};