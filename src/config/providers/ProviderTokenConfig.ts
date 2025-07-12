import { ProviderKey } from '../../types/provider';

interface ProviderTokenDefaults {
  defaultMaxTokens: number;
  defaultThinkingBudget: number;
}

// Provider-specific token defaults
const PROVIDER_TOKEN_DEFAULTS: Record<ProviderKey, ProviderTokenDefaults> = {
  openai: {
    defaultMaxTokens: 4096,
    defaultThinkingBudget: 16000
  },
  anthropic: {
    defaultMaxTokens: 4096,
    defaultThinkingBudget: 16000
  },
  // Add other providers with their specific defaults
};

// Remove this unused export
// export const getProviderTokenDefaults = (provider: ProviderKey): ProviderTokenDefaults => {
//   return PROVIDER_TOKEN_DEFAULTS[provider] || {
//     defaultMaxTokens: DEFAULT_TOKEN_CONFIG.max_tokens,
//     defaultThinkingBudget: DEFAULT_TOKEN_CONFIG.thinking.budget_tokens
//   };
// };