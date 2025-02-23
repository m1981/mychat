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
import { ProviderRegistry } from '@config/providers/provider.registry';
import { ProviderKey } from '@type/chat';
import { ProviderModel } from '@config/providers/provider.config';

const enforceTokenLimit = (config: ChatConfig): ChatConfig => {
  try {
    const providerConfig = ProviderRegistry.getProvider(config.provider);
    if (!providerConfig) return _defaultChatConfig; // Fallback to default if provider is invalid

    const model = providerConfig.models.find((m: ProviderModel) => m.id === config.modelConfig.model);
    if (!model) {
      // If model doesn't exist in provider's config, use default model
      return {
        ...config,
        modelConfig: {
          ..._defaultModelConfig,
          model: _defaultModelConfig.model,
        },
      };
    }

    return {
      ...config,
      modelConfig: {
        ...config.modelConfig,
        max_tokens: Math.min(
          Math.max(1, config.modelConfig.max_tokens || _defaultModelConfig.max_tokens),
          model.maxTokens
        ),
      },
    };
  } catch (error) {
    console.warn('Error enforcing token limit:', error);
    return _defaultChatConfig;
  }
};


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
  const config = {
    provider: 'openai' as ProviderKey,
    modelConfig: {
      model: oldConfig?.model || _defaultModelConfig.model,
      max_tokens: oldConfig?.max_tokens || _defaultModelConfig.max_tokens,
      temperature: oldConfig?.temperature || _defaultModelConfig.temperature,
      presence_penalty: oldConfig?.presence_penalty || _defaultModelConfig.presence_penalty,
      top_p: oldConfig?.top_p || _defaultModelConfig.top_p,
      frequency_penalty: oldConfig?.frequency_penalty || _defaultModelConfig.frequency_penalty,
    }
  };

  // Enforce token limits for converted config
  return enforceTokenLimit(config);
};

export const validateAndFixChats = (chats: any[]): chats is ChatInterface[] => {
  if (!Array.isArray(chats)) return false;

  try {
    for (const chat of chats) {
      // Validate basic properties
      if (!(typeof chat.id === 'string')) chat.id = uuidv4();
      if (!(typeof chat.title === 'string') || chat.title.trim() === '') {
        chat.title = 'Imported Chat';
      }
      if (chat.titleSet === undefined) chat.titleSet = false;
      if (!(typeof chat.titleSet === 'boolean')) chat.titleSet = false;

      // Ensure messages exist and are valid
      if (!Array.isArray(chat.messages)) {
        chat.messages = [];
      }

      if (!validateMessages(chat.messages)) {
        return false;
      }

      // Handle config conversion and validation
      try {
        if (!chat.config) {
          chat.config = _defaultChatConfig;
        } else if (!chat.config.provider || !chat.config.modelConfig) {
          if (isLegacyConfig(chat.config)) {
            chat.config = convertLegacyConfig(chat.config);
          } else {
            chat.config = _defaultChatConfig;
          }
        }

        chat.config = enforceTokenLimit(chat.config);
      } catch (error) {
        console.warn('Error processing chat config:', error);
        chat.config = _defaultChatConfig;
      }
    }

    return true;
  } catch (error) {
    console.error('Error validating chats:', error);
    return false;
  }
};

const validateMessages = (messages: MessageInterface[]): boolean => {
  if (!Array.isArray(messages)) return false;
  
  for (const message of messages) {
    if (!message.content || !message.role) return false;
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
  if (typeof folders !== 'object' || folders === null) return false;

  for (const folderId in folders) {
    const folder = folders[folderId];
    if (!folder) return false;

    // Check if all required properties exist and are not null/undefined
    if (!('id' in folder) ||
        !('name' in folder) ||
        !('order' in folder) ||
        !('expanded' in folder)) {
      return false;
    }
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
