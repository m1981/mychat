/**
 * Application Constants
 * 
 * This file contains all application-wide constants.
 * Import constants from here instead of from individual files.
 */

import { ProviderKey, ModelConfig, ChatConfig } from '../types';

// Provider constants
export const DEFAULT_PROVIDER: ProviderKey = 'anthropic';

// Model constants
export const DEFAULT_MODEL_CONFIG: ModelConfig = {
  model: 'claude-3-7-sonnet-20250219',
  temperature: 0.7,
  top_p: 1,
  presence_penalty: 0,
  frequency_penalty: 0,
  max_tokens: 4096,
  enableThinking: false,
  thinkingConfig: { budget_tokens: 0 }
};

// Chat constants
export const DEFAULT_SYSTEM_MESSAGE = 'You are a helpful assistant.';

export const DEFAULT_CHAT_CONFIG: ChatConfig = {
  provider: DEFAULT_PROVIDER,
  modelConfig: DEFAULT_MODEL_CONFIG,
};

// For backward compatibility
export const ENABLE_THINKING_BY_DEFAULT = false;
export const DEFAULT_THINKING_BUDGET = 1000;
