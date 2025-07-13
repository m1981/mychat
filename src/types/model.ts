/**
 * Model-related types
 */
import { ProviderKey } from './provider';

export interface ModelCapabilities {
  modelId: string;
  provider: ProviderKey;
  maxResponseTokens: number;
  defaultResponseTokens: number;
  maxContextTokens?: number;
  supportsThinking?: boolean;
  defaultThinkingBudget?: number;
  supportsVision?: boolean;
  supportsTools?: boolean;
}

export interface TokenLimits {
  maxResponseTokens: number;
  maxContextTokens?: number;
  defaultResponseTokens: number;
  defaultThinkingBudget?: number;
}