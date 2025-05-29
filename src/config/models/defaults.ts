import { ModelCapabilities } from '../types/model.types';

export const MODEL_CAPABILITIES: Map<string, ModelCapabilities> = new Map([
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
  // Other models...
]);