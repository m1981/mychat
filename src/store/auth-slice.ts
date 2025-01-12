import { defaultAPIEndpoint } from '@constants/auth';
import { StoreSlice } from './store';
import { providers } from '@type/providers';
import { officialAPIEndpoint } from '@constants/auth';
import { ProviderKey } from '@type/chat';
import { User } from 'firebase/auth';

export interface AuthSlice {
  apiKeys: Record<ProviderKey, string>;
  apiEndpoints: Record<ProviderKey, string>;
  firstVisit: boolean;
  user: User | null;
  setApiKey: (provider: ProviderKey, key: string) => void;
  setApiEndpoint: (provider: ProviderKey, endpoint: string) => void;
  setFirstVisit: (firstVisit: boolean) => void;
  setUser: (user: User | null) => void;
}

export const createAuthSlice: StoreSlice<AuthSlice> = (set, get) => ({
  apiKeys: {
    openai: import.meta.env.VITE_OPENAI_API_KEY || '',
    anthropic: import.meta.env.VITE_ANTHROPIC_API_KEY || '',
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
  user: null,
  setUser: (user: User | null) => {
    set((prev) => ({ ...prev, user }));
  },
});