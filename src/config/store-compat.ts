/**
 * This file provides compatibility with the existing store structure
 * while we transition to the new configuration system.
 */
import { DEFAULT_CHAT_CONFIG, DEFAULT_MODEL_CONFIG, DEFAULT_PROVIDER } from '../constants';
import { ProviderKey } from '../types';

// Re-export constants and functions needed by the store
export {
  DEFAULT_CHAT_CONFIG,
  DEFAULT_MODEL_CONFIG,
  DEFAULT_PROVIDER
};

// Add type guard for provider key
const isProviderKey = (key: string): key is ProviderKey => 
  key === 'openai' || key === 'anthropic';
