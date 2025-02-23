import { v4 as uuidv4 } from 'uuid';
import { ProviderKey, ChatConfig, ModelConfig, ChatInterface, ModelOptions } from '@type/chat';
import useStore from '@store/store';

import { ModelRegistry } from '../config/models/model.registry';
import { ProviderRegistry } from '../config/providers/provider.registry';

const defaultProvider = ProviderRegistry.getProvider('anthropic');
const defaultModel = defaultProvider.defaultModel;
const modelCapabilities = ModelRegistry.getModelCapabilities(defaultModel);

export const _defaultSystemMessage =
  import.meta.env.VITE_DEFAULT_SYSTEM_MESSAGE ??
  `Be my helpful female advisor.`;

export const _defaultModelConfig: ModelConfig = {
  model: defaultModel,
  max_tokens: modelCapabilities.defaultResponseTokens,
  temperature: 0,
  presence_penalty: 0,
  top_p: 1,
  frequency_penalty: 0,
};

export const DEFAULT_PROVIDER: ProviderKey = 'anthropic';

export const _defaultChatConfig: ChatConfig = {
  provider: DEFAULT_PROVIDER,
  modelConfig: _defaultModelConfig,
};

export const generateDefaultChat = (
  title?: string,
  folder?: string
): ChatInterface => {
  const storeState = useStore.getState();
  
  return {
    id: uuidv4(),
    title: title || 'New Chat',
    messages: storeState.defaultSystemMessage
      ? [{ role: 'system', content: storeState.defaultSystemMessage }]
      : [],
    config: {
      provider: storeState.defaultChatConfig.provider,
      modelConfig: { ...storeState.defaultChatConfig.modelConfig },
    },
    titleSet: false,
    folder,
  };
};

export const codeLanguageSubset = [
  'dockerfile',
  'python',
  'javascript',
  'java',
  'groovy',
  'gradle',
  'go',
  'bash',
  'c',
  'cpp',
  'csharp',
  'css',
  'diff',
  'graphql',
  'json',
  'kotlin',
  'less',
  'lua',
  'makefile',
  'markdown',
  'objectivec',
  'perl',
  'php',
  'php-template',
  'plaintext',
  'python-repl',
  'r',
  'ruby',
  'rust',
  'scss',
  'shell',
  'sql',
  'swift',
  'typescript',
  'vbnet',
  'wasm',
  'xml',
  'yaml',
];
