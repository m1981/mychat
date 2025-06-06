
import { officialAPIEndpoint } from '@constants/auth';
import { ProviderKey } from '@type/chat';
import { getEnvVar } from '@utils/env';

import { StoreSlice } from './store';

export interface AuthSlice {
  apiKeys: Record<ProviderKey, string>;
  apiEndpoints: Record<ProviderKey, string>;
  firstVisit: boolean;
  setApiKey: (provider: ProviderKey, key: string) => void;
  setApiEndpoint: (provider: ProviderKey, endpoint: string) => void;
  setFirstVisit: (firstVisit: boolean) => void;
}

export const createAuthSlice: StoreSlice<AuthSlice> = (set) => {
  // Try to load from localStorage first
  let storedKeys = { openai: '', anthropic: '' };
  let storedEndpoints = { 
    openai: officialAPIEndpoint,
    anthropic: 'https://api.anthropic.com/v1/messages'
  };
  let firstVisitValue = true;
  
  try {
    const storedAuth = localStorage.getItem('auth-store');
    if (storedAuth) {
      const parsed = JSON.parse(storedAuth);
      if (parsed.apiKeys) storedKeys = parsed.apiKeys;
      if (parsed.apiEndpoints) storedEndpoints = parsed.apiEndpoints;
      if (parsed.firstVisit !== undefined) firstVisitValue = parsed.firstVisit;
      
      console.log('[AuthSlice] Loaded from localStorage:', {
        openai: storedKeys.openai ? 'present' : 'missing',
        anthropic: storedKeys.anthropic ? 'present' : 'missing'
      });
    }
  } catch (e) {
    console.error('[AuthSlice] Error loading from localStorage:', e);
  }
  
  // Fall back to environment variables if localStorage values are empty
  const openaiKey = storedKeys.openai || getEnvVar('VITE_OPENAI_API_KEY', '');
  const anthropicKey = storedKeys.anthropic || getEnvVar('VITE_ANTHROPIC_API_KEY', '');
  
  console.log('[AuthSlice] Initializing with keys:', {
    openai: openaiKey ? 'present' : 'missing',
    anthropic: anthropicKey ? 'present' : 'missing'
  });
  
  return {
    apiKeys: {
      openai: openaiKey,
      anthropic: anthropicKey,
    },
    apiEndpoints: storedEndpoints,
    firstVisit: firstVisitValue,
    setApiKey: (provider: ProviderKey, key: string) => {
      console.log(`[AuthSlice] Setting API key for ${provider}: ${key ? 'present' : 'missing'}`);
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
  };
};