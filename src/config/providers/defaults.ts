import { ProviderKey } from '../../types';

// Define provider capabilities
export const providerCapabilities = {
  anthropic: {
    supportsThinking: true,
    defaultThinkingModel: 'claude-3-7-sonnet-20250219',
    maxCompletionTokens: 8192,
    defaultModel: 'claude-3-7-sonnet-20250219',
    defaultThinkingBudget: 16000
  },
  openai: {
    supportsThinking: false,
    defaultThinkingModel: undefined,
    maxCompletionTokens: 4096,
    defaultModel: 'gpt-4o',
    defaultThinkingBudget: 0
  }
};

// Get provider capabilities
export function getProviderCapabilities(provider: ProviderKey) {
  const capabilities = providerCapabilities[provider];
  if (!capabilities) {
    throw new Error(`Provider ${provider} not found`);
  }
  return capabilities;
}
