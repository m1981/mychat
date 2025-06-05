import { ModelRegistry } from '../models/model.registry';

export interface TokenLimits {
  maxResponseTokens: number;
  maxContextTokens: number;
  defaultResponseTokens: number;
}

export const getTokenLimitsForModel = (modelId: string): TokenLimits => {
  return ModelRegistry.getModelCapabilities(modelId);
};

export const DEFAULT_TOKEN_CONFIG = {
  max_tokens: 4096,
  thinking: {
    budget_tokens: 16000
  }
};

// Helper functions for token validation
export const validateMaxTokens = (value: number, modelId: string): number => {
  const limits = getTokenLimitsForModel(modelId);
  return Math.min(value, limits.maxResponseTokens);
};

export const validateThinkingBudget = (budget: number, maxTokens: number): number => {
  return Math.min(budget, maxTokens);
};