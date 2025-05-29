//src/components/ImportExportChat/ImportExportChat.tsx
import { useRef, useState } from 'react';

import PopupModal from '@components/PopupModal';
import { ProviderRegistry } from '@config/providers/registry';
import ExportIcon from '@icon/ExportIcon';
import useStore from '@store/store';
import { ChatInterface, FolderCollection, ProviderKey } from '@type/chat';
import { Export } from '@type/export';
import { getToday } from '@utils/date';
import downloadFile from '@utils/downloadFile';
import { useTranslation } from 'react-i18next';

interface ImportAlert {
  message: string;
  success: boolean;
}

// Define types for validation
interface ImportMessage {
  role: string;
  content: string | null;
}

interface ImportModelConfig {
  model: string;
  max_tokens: number;
  temperature: number;
  presence_penalty: number;
  top_p: number;
  frequency_penalty: number;
  enableThinking?: boolean;
  thinkingConfig?: {
    budget_tokens: number;
  };
}

interface ImportChatConfig {
  provider: ProviderKey;
  modelConfig: ImportModelConfig;
}

interface ImportChat {
  id: string;
  title: string;
  messages: ImportMessage[];
  config: ImportChatConfig;
  folder?: string;
}

interface ImportFolder {
  id: string;
  name: string;
  expanded: boolean;
  order: number;
}

interface ImportData {
  version?: number;
  chats: ImportChat[];
  folders?: Record<string, ImportFolder>;
}

const ImportExportChat = () => {
  const { t } = useTranslation();
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  return (
    <>
      <a
        className='flex py-2 px-2 items-center gap-3 rounded-md hover:bg-gray-500/10 transition-colors duration-200 text-gray-800 dark:text-gray-100 cursor-pointer text-sm'
        onClick={() => setIsModalOpen(true)}
      >
        <ExportIcon className='w-4 h-4' />
        {t('import')} / {t('export')}
      </a>
      {isModalOpen && (
        <PopupModal
          title={`${t('import')} / ${t('export')}`}
          setIsModalOpen={setIsModalOpen}
          cancelButton={false}
        >
          <div className='p-6 border-b border-gray-200 dark:border-gray-600'>
            <ImportChat />
            <ExportChat />
          </div>
        </PopupModal>
      )}
    </>
  );
};

const ImportChat = () => {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [alert, setAlert] = useState<ImportAlert | null>(null);
  
  const setChats = useStore((state) => state.setChats);
  const setFolders = useStore((state) => state.setFolders);

  const validateMessage = (msg: ImportMessage, chatId: string, index: number): boolean => {
    if (!msg) {
      throw new Error(`Chat ${chatId}: Message at index ${index} is null or undefined`);
    }
    
    if (typeof msg !== 'object') {
      throw new Error(`Chat ${chatId}: Message at index ${index} is not an object`);
    }

    // Handle empty content - set to empty string if undefined/null
    if (msg.content === undefined || msg.content === null) {
      msg.content = '';
    } else if (typeof msg.content !== 'string') {
      // If content exists but isn't a string, try to convert it
      try {
        msg.content = String(msg.content);
      } catch (_error) {
        throw new Error(`Chat ${chatId}: Message at index ${index} has invalid 'content' that cannot be converted to string`);
      }
    }

    if (!msg.role) {
      throw new Error(`Chat ${chatId}: Message at index ${index} is missing 'role' field`);
    }

    if (typeof msg.role !== 'string') {
      throw new Error(`Chat ${chatId}: Message at index ${index} has invalid 'role' type (expected string)`);
    }

    // Validate role is one of the expected values
    const validRoles = ['user', 'assistant', 'system'];
    if (!validRoles.includes(msg.role)) {
      throw new Error(`Chat ${chatId}: Message at index ${index} has invalid role '${msg.role}'. Must be one of: ${validRoles.join(', ')}`);
    }

    return true;
  };

  const validateModelConfig = (provider: ProviderKey, modelConfig: ImportModelConfig, chatId: string): ImportModelConfig => {
    // Get provider capabilities
    const capabilities = ProviderRegistry.getProviderCapabilities(provider);
    
    // Basic required fields for all providers
    const baseRequiredFields = [
      'model', 'max_tokens', 'temperature', 'presence_penalty',
      'top_p', 'frequency_penalty'
    ];

    // Check base required fields
    baseRequiredFields.forEach(field => {
      if (!(field in modelConfig)) {
        throw new Error(`Chat ${chatId}: modelConfig is missing required field '${field}'`);
      }
    });

    // Validate numeric fields
    const numericFields = ['max_tokens', 'temperature', 'presence_penalty', 'top_p', 'frequency_penalty'];
    numericFields.forEach(field => {
      if (typeof modelConfig[field as keyof typeof modelConfig] !== 'number') {
        throw new Error(`Chat ${chatId}: modelConfig.${field} must be a number`);
      }
    });

    // Handle thinking capability based on provider
    if (capabilities.supportsThinking) {
      if (!('enableThinking' in modelConfig)) {
        modelConfig.enableThinking = false; // Default value
      }
      if (typeof modelConfig.enableThinking !== 'boolean') {
        modelConfig.enableThinking = Boolean(modelConfig.enableThinking);
      }
      
      // Add thinkingConfig if missing
      if (modelConfig.enableThinking && (!modelConfig.thinkingConfig || !modelConfig.thinkingConfig.budget_tokens)) {
        modelConfig.thinkingConfig = {
          budget_tokens: 1000 // Default value
        };
      }
    } else {
      // For providers that don't support thinking, ensure these fields are not present
      delete modelConfig.enableThinking;
      delete modelConfig.thinkingConfig;
    }

    // Validate and potentially update the model ID
    const validModel = ProviderRegistry.validateModelForProvider(provider, modelConfig.model);
    if (!validModel) {
      modelConfig.model = ProviderRegistry.getDefaultModelForProvider(provider);
      console.warn(`Model "${modelConfig.model}" not found for provider "${provider}". Using default model "${modelConfig.model}"`);
    }

    return modelConfig;
  };

  const validateChat = (chat: ImportChat, index: number): boolean => {
    if (!chat.id) {
      throw new Error(`Chat at index ${index}: Missing required field 'id'`);
    }

    if (!chat.title) {
      throw new Error(`Chat ${chat.id}: Missing required field 'title'`);
    }

    if (!Array.isArray(chat.messages)) {
      throw new Error(`Chat ${chat.id}: 'messages' must be an array`);
    }

    // Validate messages
    chat.messages.forEach((msg: ImportMessage, msgIndex: number) => {
      validateMessage(msg, chat.id, msgIndex);
    });

    if (!chat.config) {
      throw new Error(`Chat ${chat.id}: Missing required field 'config'`);
    }

    if (!chat.config.provider) {
      throw new Error(`Chat ${chat.id}: Missing required field 'config.provider'`);
    }

    const provider = chat.config.provider as ProviderKey;
    if (provider !== 'anthropic' && provider !== 'openai') {
      throw new Error(`Chat ${chat.id}: Invalid provider '${provider}'. Must be 'anthropic' or 'openai'`);
    }

    const modelConfig = chat.config.modelConfig;
    if (!modelConfig) {
      throw new Error(`Chat ${chat.id}: Missing required field 'config.modelConfig'`);
    }

    // Validate and update modelConfig based on provider capabilities
    chat.config.modelConfig = validateModelConfig(provider, modelConfig, chat.id);

    return true;
  };

  const validateFolder = (folder: ImportFolder, id: string): boolean => {
    if (!folder.id) {
      throw new Error(`Folder ${id}: Missing required field 'id'`);
    }

    if (!folder.name) {
      throw new Error(`Folder ${id}: Missing required field 'name'`);
    }

    if (typeof folder.expanded !== 'boolean') {
      throw new Error(`Folder ${id}: 'expanded' must be a boolean`);
    }

    if (typeof folder.order !== 'number') {
      throw new Error(`Folder ${id}: 'order' must be a number`);
    }

    return true;
  };

  const handleFileUpload = async () => {
    if (!inputRef.current?.files?.length) {
      setAlert({ message: t('Please select a file to import'), success: false });
      return;
    }

    const file = inputRef.current.files[0];
    if (file.size > 100 * 1024 * 1024) {
      setAlert({ message: t('File size too large. Maximum size is 100MB'), success: false });
      return;
    }

    try {
      const fileContent = await file.text();
      let importData: ImportData;
      
      try {
        importData = JSON.parse(fileContent);
      } catch (_error) {
        throw new Error('Failed to parse JSON file. Please ensure the file contains valid JSON.');
      }

      // Handle both single chat array and full export format
      let processedChats: ChatInterface[];
      let processedFolders: FolderCollection = {};

      if (Array.isArray(importData)) {
        // Single chat or array of chats format
        processedChats = importData.map((chat: ImportChat, index: number) => {
          validateChat(chat, index);
          return chat as unknown as ChatInterface;
        });
      } else {
        // Full export format
        if (importData.version !== 1) {
          throw new Error(`Unsupported import version: ${importData.version}. Expected version 1.`);
        }

        if (!Array.isArray(importData.chats)) {
          throw new Error("Invalid format: 'chats' must be an array");
        }

        processedChats = importData.chats.map((chat: ImportChat, index: number) => {
          validateChat(chat, index);
          return chat as unknown as ChatInterface;
        });

        // Validate folders if present
        if (importData.folders) {
          if (typeof importData.folders !== 'object' || importData.folders === null) {
            throw new Error("Invalid format: 'folders' must be an object");
          }

          Object.entries(importData.folders).forEach(([id, folder]: [string, ImportFolder]) => {
            validateFolder(folder, id);
            processedFolders[id] = folder as unknown as FolderCollection[string];
          });
        }
      }

      // Update store
      setFolders(processedFolders);
      setChats(processedChats);

      setAlert({
        message: t('Successfully imported!'),
        success: true
      });
    } catch (error: unknown) {
      console.error('Import error:', error);
      setAlert({
        message: `${t('Import failed')}: ${(error as Error).message}`,
        success: false
      });
    }
  };

  return (
    <>
      <label className='mb-2 block text-sm font-medium text-gray-900 dark:text-gray-300'>
        {t('import')} (JSON)
      </label>
      <div className='flex items-center gap-2'>
        <input
          className='flex-1 cursor-pointer rounded-md border border-gray-300 bg-gray-50 text-sm text-gray-800 file:cursor-pointer file:border-0 file:bg-gray-100 file:p-2 file:text-gray-700 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:file:bg-gray-700 dark:file:text-gray-200'
          type='file'
          ref={inputRef}
          accept=".json"
        />
        <button
          className='btn btn-primary btn-small'
          onClick={handleFileUpload}
        >
          {t('import')}
        </button>
      </div>
      {alert && (
        <div
          className={`mt-4 rounded-md p-4 text-sm ${
            alert.success
              ? 'bg-green-50 text-green-800 dark:bg-green-900/30 dark:text-green-200'
              : 'bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-200'
          }`}
        >
          {alert.message}
        </div>
      )}
    </>
  );
};

const ExportChat = () => {
  const { t } = useTranslation();
  // Use hooks properly here too
  const chats = useStore((state) => state.chats);
  const folders = useStore((state) => state.folders);

  return (
    <div className='mt-6'>
      <div className='block mb-2 text-sm font-medium text-gray-900 dark:text-gray-300'>
        {t('export')} (JSON)
      </div>
      <button
        className='btn btn-small btn-primary'
        onClick={() => {
          const fileData: Export = {
            version: 1,
            chats: chats || [], // Provide empty array as fallback
            folders: folders || {},
          };
          downloadFile(fileData, getToday());
        }}
      >
        {t('export')}
      </button>
    </div>
  );
};

export default ImportExportChat;
