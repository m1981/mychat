// src/constants/provider.ts
import { ProviderKey } from '@type/chat';

export const DEFAULT_PROVIDER: ProviderKey = 'anthropic';

export const PROVIDER_CONFIGS = {
  maxTokensDefault: 1000,
  minTokens: 100,
  tokenStep: 100,
};

export const isValidProvider = (provider: string): provider is ProviderKey => {
  return ['openai', 'anthropic'].includes(provider);
};
