import { v4 as uuidv4 } from 'uuid';
import { ChatInterface, ConfigInterface, ModelOptions } from '@type/chat';
import useStore from '@store/store';

const date = new Date();
const dateString =
  date.getFullYear() +
  '-' +
  ('0' + (date.getMonth() + 1)).slice(-2) +
  '-' +
  ('0' + date.getDate()).slice(-2);

// default system message obtained using the following method: https://twitter.com/DeminDimin/status/1619935545144279040
export const _defaultSystemMessage =
  import.meta.env.VITE_DEFAULT_SYSTEM_MESSAGE ??
  `Be my helpful female advisor.`;

export const modelOptions: ModelOptions[] = [
  'gpt-3.5-turbo',
  'gpt-3.5-turbo-1106',
  'gpt-4',
  'gpt-4-1106-preview',
];

export const defaultModel = 'gpt-4-1106-preview';
/*
GPT-4 Turbo 128K
Input: $0.01
Output: $0.03

GPT-3.5 Turbo 16K
Input: $0.001
Output: $0.002
*/

export const modelMaxToken = {
  'gpt-3.5-turbo': 16384,
  'gpt-3.5-turbo-1106': 16384,
  'gpt-4': 8192,
  'gpt-4-1106-preview': 131072,
};

export const modelCost = {
  'gpt-3.5-turbo': { price: 0.002, unit: 1000 },
  'gpt-3.5-turbo-1106': { price: 0.01, unit: 1000 },
  'gpt-4': { price: 0.03, unit: 1000 },
  'gpt-4-1106-preview': { price: 0.01, unit: 1000 },
};

export const defaultUserMaxToken = 16384;

export const _defaultChatConfig: ConfigInterface = {
  model: defaultModel,
  max_tokens: defaultUserMaxToken,
  temperature: 1,
  presence_penalty: 0,
  top_p: 1,
  frequency_penalty: 0,
};

export const generateDefaultChat = (title?: string, folder?: string): ChatInterface => ({
  id: uuidv4(),
  title: title ? title : 'New Chat',
  messages:
    useStore.getState().defaultSystemMessage.length > 0
      ? [{ role: 'system', content: useStore.getState().defaultSystemMessage }]
      : [],
  config: { ...useStore.getState().defaultChatConfig },
  titleSet: false,
  folder
});

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
