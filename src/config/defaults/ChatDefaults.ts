import { ProviderKey, ChatConfig } from '@type/chat';

import { createDefaultModelConfig } from './ModelDefaults';

export const DEFAULT_PROVIDER: ProviderKey = 'anthropic';

export const DEFAULT_SYSTEM_MESSAGE = import.meta.env.VITE_DEFAULT_SYSTEM_MESSAGE ?? 
  'Be my helpful female advisor.';

export const DEFAULT_MODEL_CONFIG = createDefaultModelConfig();

export const DEFAULT_CHAT_CONFIG: Readonly<ChatConfig> = Object.freeze({
  provider: DEFAULT_PROVIDER,
  modelConfig: DEFAULT_MODEL_CONFIG,
});