import { ProviderKey } from './types/provider.types';

// Core constants
export const DEFAULT_PROVIDER: ProviderKey = 'anthropic';
export const DEFAULT_SYSTEM_MESSAGE = import.meta.env.VITE_DEFAULT_SYSTEM_MESSAGE ?? 
  'Be my helpful female advisor.';

// Feature flags
export const ENABLE_THINKING_BY_DEFAULT = false;
export const DEFAULT_THINKING_BUDGET = 1000;