import { v4 as uuidv4 } from 'uuid';
import { ChatConfig, ModelConfig, ChatInterface, ModelOptions } from '@type/chat';
import useStore from '@store/store';

// default system message obtained using the following method: https://twitter.com/DeminDimin/status/1619935545144279040
export const _defaultSystemMessage =
  import.meta.env.VITE_DEFAULT_SYSTEM_MESSAGE ??
  `Be my helpful female advisor.`;

export const modelOptions: ModelOptions[] = [
  'gpt-3.5-turbo',
  'gpt-3.5-turbo-1106',
  'gpt-4',
  'gpt-4-1106-preview',
  'gpt-4-1106-preview',
  'gpt-4o',
];

export const defaultModel = 'gpt-4o';

export const modelMaxToken = {
  'gpt-3.5-turbo': 16384,
  'gpt-3.5-turbo-1106': 16384,
  'gpt-4': 8192,
  'gpt-4-1106-preview': 131072,
  'gpt-4o': 131072,
};

export const modelCost = {
  'gpt-3.5-turbo': { price: 0.002, unit: 1000 },
  'gpt-3.5-turbo-1106': { price: 0.01, unit: 1000 },
  'gpt-4': { price: 0.03, unit: 1000 },
  'gpt-4-1106-preview': { price: 0.01, unit: 1000 },
  'gpt-4o': { price: 0.01, unit: 1000 },
};

export const defaultUserMaxToken = 16384;

export const _defaultModelConfig: ModelConfig = {
  model: 'claude-3-opus-latest',
  max_tokens: 16384,
  temperature: 0,
  presence_penalty: 0,
  top_p: 1,
  frequency_penalty: 0,
};

export const _defaultChatConfig: ChatConfig = {
  provider: 'anthropic',
  modelConfig: _defaultModelConfig,
};

export const generateDefaultChat = (
  title?: string,
  folder?: string
): ChatInterface => {
  const storeState = useStore.getState();
  console.log('Default chat config:', storeState.defaultChatConfig);

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
