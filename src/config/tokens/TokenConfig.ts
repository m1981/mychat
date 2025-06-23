import { ModelRegistry } from '../models/model.registry';
import { debug } from '@utils/debug';

export interface TokenLimits {
  maxResponseTokens: number;
  maxContextTokens: number;
  defaultResponseTokens: number;
}

export const getTokenLimitsForModel = (modelId: string): TokenLimits => {
  debug.log('tokens', `Getting token limits for model: "${modelId}"`);
  
  if (!modelId) {
    debug.error('tokens', `Invalid model ID: ${modelId}`);
    // Return safe defaults instead of throwing
    return {
      maxResponseTokens: 4096,
      maxContextTokens: 16000,
      defaultResponseTokens: 1024
    };
  }
  
  try {
    return ModelRegistry.getModelCapabilities(modelId);
  } catch (error) {
    debug.error('tokens', `Error getting token limits for model "${modelId}": ${error.message}`);
    // Return safe defaults
    return {
      maxResponseTokens: 4096,
      maxContextTokens: 16000,
      defaultResponseTokens: 1024
    };
  }
};

export const DEFAULT_TOKEN_CONFIG = {
  max_tokens: 4096,
  thinking: {
    budget_tokens: 16000
  }
};

// Helper functions for token validation
export const validateMaxTokens = (value: number, modelId: string): number => {
  debug.log('tokens', `Validating max tokens: value=${value}, modelId="${modelId}"`);
  
  if (!modelId) {
    debug.warn('tokens', `No model ID provided for token validation, using default limit of 4096`);
    return Math.min(value, 4096);
  }
  
  try {
    const limits = getTokenLimitsForModel(modelId);
    debug.log('tokens', `Token limits for model "${modelId}": ${JSON.stringify(limits)}`);
    return Math.min(value, limits.maxResponseTokens);
  } catch (error) {
    debug.error('tokens', `Error validating max tokens: ${error.message}`);
    return Math.min(value, 4096); // Safe default
  }
};

export const validateThinkingBudget = (budget: number, maxTokens: number): number => {
  debug.log('tokens', `Validating thinking budget: budget=${budget}, maxTokens=${maxTokens}`);
  return Math.min(budget, maxTokens);
};