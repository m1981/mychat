import { defaultAPIEndpoint } from '@constants/auth';
import { StoreSlice } from './store';
import { providers } from '@type/providers';
import { officialAPIEndpoint } from '@constants/auth';
import { ProviderKey } from '@type/chat';

export interface AuthSlice {
  provider: ProviderKey;
  apiKeys: Record<ProviderKey, string>;
  apiEndpoints: Record<ProviderKey, string>;
  firstVisit: boolean;
  setProvider: (provider: ProviderKey) => void;
  setApiKey: (provider: ProviderKey, apiKey: string) => void;
  setFirstVisit: (firstVisit: boolean) => void;
}

export const createAuthSlice: StoreSlice<AuthSlice> = (set, get) => ({
  provider: 'openai',
  apiKeys: {
    openai: import.meta.env.VITE_OPENAI_API_KEY || '',
    anthropic: import.meta.env.VITE_ANTHROPIC_API_KEY || '',
  },
  apiEndpoints: {
    openai: officialAPIEndpoint,
    anthropic: 'https://api.anthropic.com/v1/messages',
  },
  firstVisit: true,
  setProvider: (provider: ProviderKey) => {
    set((prev: AuthSlice) => ({
      ...prev,
      provider,
      // Optionally reset endpoint to provider's default
      apiEndpoint: providers[provider].endpoints[0],
    }));
  },
  setApiKey: (provider: ProviderKey, apiKey: string) => {
    set((prev: AuthSlice) => ({
      ...prev,
      apiKeys: {
        ...prev.apiKeys,
        [provider]: apiKey,
      },
    }));
  },
  setFirstVisit: (firstVisit: boolean) => {
    set((prev: AuthSlice) => ({
      ...prev,
      firstVisit,
    }));
  },
});