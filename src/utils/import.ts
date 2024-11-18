// src/utils/import.ts
import { v4 as uuidv4 } from 'uuid';
import {
  ChatInterface,
  ChatConfig,
  FolderCollection,
  MessageInterface,
  Role,
} from '@type/chat';
import { roles } from '@type/chat';
import { _defaultChatConfig, _defaultModelConfig } from '@constants/chat';
import { ExportV1, LegacyExport } from '@type/export';

// Type guard for legacy config format
interface LegacyConfig {
  model: string;
  max_tokens: number;
  temperature: number;
  presence_penalty: number;
  top_p: number;
  frequency_penalty: number;
}

const isLegacyConfig = (config: any): config is LegacyConfig => {
  return (
    config &&
    typeof config === 'object' &&
    'model' in config &&
    'max_tokens' in config &&
    'temperature' in config
  );
};

// Convert legacy config to new format
const convertLegacyConfig = (oldConfig: LegacyConfig | undefined): ChatConfig => {
  return {
    provider: 'openai',
    modelConfig: {
      model: oldConfig?.model || _defaultModelConfig.model,
      max_tokens: oldConfig?.max_tokens || _defaultModelConfig.max_tokens,
      temperature: oldConfig?.temperature || _defaultModelConfig.temperature,
      presence_penalty: oldConfig?.presence_penalty || _defaultModelConfig.presence_penalty,
      top_p: oldConfig?.top_p || _defaultModelConfig.top_p,
      frequency_penalty: oldConfig?.frequency_penalty || _defaultModelConfig.frequency_penalty,
    }
  };
};

export const validateAndFixChats = (chats: any[]): chats is ChatInterface[] => {
  if (!Array.isArray(chats)) return false;

  for (const chat of chats) {
    // Validate basic properties
    if (!(typeof chat.id === 'string')) chat.id = uuidv4();
    if (!(typeof chat.title === 'string') || chat.title === '') return false;
    if (chat.titleSet === undefined) chat.titleSet = false;
    if (!(typeof chat.titleSet === 'boolean')) return false;
    if (!validateMessages(chat.messages)) return false;
    
    // Handle config conversion
    if (!chat.config) {
      chat.config = _defaultChatConfig;
    } else if (!chat.config.provider || !chat.config.modelConfig) {
      if (isLegacyConfig(chat.config)) {
        chat.config = convertLegacyConfig(chat.config);
      } else {
        chat.config = _defaultChatConfig;
      }
    }
  }

  return true;
};

const validateMessages = (messages: MessageInterface[]): boolean => {
  if (!Array.isArray(messages)) return false;
  
  for (const message of messages) {
    if (!(typeof message.content === 'string')) return false;
    if (!(typeof message.role === 'string')) return false;
    if (!roles.includes(message.role as Role)) return false;
  }
  
  return true;
};

export const isLegacyImport = (importedData: any): importedData is LegacyExport => {
  return (
    Array.isArray(importedData) && 
    importedData.every(item => 
      typeof item === 'object' &&
      'id' in item &&
      'title' in item &&
      'messages' in item
    )
  );
};

export const validateFolders = (folders: FolderCollection): folders is FolderCollection => {
  if (typeof folders !== 'object') return false;

  for (const folderId in folders) {
    const folder = folders[folderId];
    if (!folder) return false;
    if (typeof folder.id !== 'string') return false;
    if (typeof folder.name !== 'string') return false;
    if (typeof folder.order !== 'number') return false;
    if (typeof folder.expanded !== 'boolean') return false;
  }

  return true;
};

export const validateExportV1 = (data: any): data is ExportV1 => {
  return (
    data &&
    typeof data === 'object' &&
    'version' in data &&
    data.version === 1 &&
    'chats' in data &&
    Array.isArray(data.chats) &&
    validateAndFixChats(data.chats) &&
    'folders' in data &&
    validateFolders(data.folders)
  );
};

// Helper function to ensure config has all required properties
export const ensureConfigComplete = (config: ChatConfig): ChatConfig => {
  return {
    provider: config.provider || _defaultChatConfig.provider,
    modelConfig: {
      model: config.modelConfig?.model || _defaultModelConfig.model,
      max_tokens: config.modelConfig?.max_tokens || _defaultModelConfig.max_tokens,
      temperature: config.modelConfig?.temperature || _defaultModelConfig.temperature,
      presence_penalty: config.modelConfig?.presence_penalty || _defaultModelConfig.presence_penalty,
      top_p: config.modelConfig?.top_p || _defaultModelConfig.top_p,
      frequency_penalty: config.modelConfig?.frequency_penalty || _defaultModelConfig.frequency_penalty,
    }
  };
};
