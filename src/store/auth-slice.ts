
import { getEnvVar } from '@utils/env';
import { officialAPIEndpoint } from '@constants/auth';
import { ProviderKey } from '@type/chat';
import { StoreSlice } from './store';

export interface AuthSlice {
  apiKeys: Record<ProviderKey, string>;
  apiEndpoints: Record<ProviderKey, string>;
  firstVisit: boolean;
  setApiKey: (provider: ProviderKey, key: string) => void;
  setApiEndpoint: (provider: ProviderKey, endpoint: string) => void;
  setFirstVisit: (firstVisit: boolean) => void;
}

export const createAuthSlice: StoreSlice<AuthSlice> = (set, get) => ({
  apiKeys: {
    openai: getEnvVar('VITE_OPENAI_API_KEY', ''),
    anthropic: getEnvVar('VITE_ANTHROPIC_API_KEY', ''),
  },
  apiEndpoints: {
    openai: officialAPIEndpoint,
    anthropic: 'https://api.anthropic.com/v1/messages',
  },
  firstVisit: true,
  setApiKey: (provider: ProviderKey, key: string) => {
    set((prev) => ({
      ...prev,
      apiKeys: { ...prev.apiKeys, [provider]: key },
    }));
  },
  setApiEndpoint: (provider: ProviderKey, endpoint: string) => {
    set((prev) => ({
      ...prev,
      apiEndpoints: { ...prev.apiEndpoints, [provider]: endpoint },
    }));
  },
  setFirstVisit: (firstVisit: boolean) => {
    set((prev) => ({ ...prev, firstVisit }));
  },
});