//src/components/ImportExportChat/ImportExportChat.tsx
import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { v4 as uuidv4 } from 'uuid';
import useStore from '@store/store';

import ExportIcon from '@icon/ExportIcon';
import downloadFile from '@utils/downloadFile';
import { getToday } from '@utils/date';
import PopupModal from '@components/PopupModal';
import {
  isLegacyImport,
  validateAndFixChats,
  validateExportV1,
} from '@utils/import';
import { ChatInterface, Folder, FolderCollection } from '@type/chat';
import { Export, ExportBase, ExportV1 } from '@type/export';
import { _defaultModelConfig, _defaultChatConfig } from '@constants/chat';

const ImportExportChat = () => {
  const { t } = useTranslation();
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  return (
    <>
      <a
        className='flex py-2 px-2 items-center gap-3 rounded-md hover:bg-gray-500/10 transition-colors duration-200 text-gray-800 dark:text-gray-100 cursor-pointer text-sm'
        onClick={() => {
          setIsModalOpen(true);
        }}
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
  const setChats = useStore.getState().setChats;
  const setFolders = useStore.getState().setFolders;
  const inputRef = useRef<HTMLInputElement>(null);
  const [alert, setAlert] = useState<{
    message: string;
    success: boolean;
  } | null>(null);

  const handleFileUpload = () => {
    if (!inputRef || !inputRef.current) return;
    const file = inputRef.current.files?.[0];

    if (!file) {
      setAlert({
        message: 'Please select a file to import',
        success: false,
      });
      return;
    }

    if (file.size > 100 * 1024 * 1024) { // 100MB limit
      setAlert({
        message: 'File size too large. Maximum size is 100MB',
        success: false,
      });
      return;
    }

    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const data = event.target?.result as string;
        if (!data) throw new Error('Failed to read file');

        const parsedData = JSON.parse(data);

        if (isLegacyImport(parsedData)) {
          if (validateAndFixChats(parsedData)) {
            handleLegacyImport(parsedData);
            setAlert({
              message: 'Successfully imported! Note: Some settings may have been adjusted to match current constraints.',
              success: true,
            });
          } else {
            setAlert({
              message: 'Invalid chat data format. Please check the file content.',
              success: false,
            });
          }
        } else if (validateExportV1(parsedData)) {
          handleV1Import(parsedData);
          setAlert({
            message: 'Successfully imported! Note: Some settings may have been adjusted to match current constraints.',
            success: true,
          });
        } else {
          setAlert({
            message: 'Invalid file format. Please use a valid export file.',
            success: false,
          });
        }
      } catch (error: unknown) {
        console.error('Import error:', error);
        setAlert({
          message: `Import failed: ${(error as Error).message || 'Unknown error'}`,
          success: false,
        });
      }
    };

    reader.onerror = () => {
      setAlert({
        message: 'Failed to read file',
        success: false,
      });
    };

    reader.readAsText(file);
  };


  const handleLegacyImport = (parsedData: ChatInterface[]) => {
    // Convert legacy configs if needed
    parsedData.forEach(chat => {
      if (!chat.config || !chat.config.provider || !chat.config.modelConfig) {
        const oldConfig = chat.config?.modelConfig;
        chat.config = {
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
      }
    });

    // Import folders logic
    const { folderNameToIdMap, newFolders } = createFoldersFromLegacy(parsedData);

    // Update folder references in chats
    parsedData.forEach((chat) => {
      if (chat.folder) {
        chat.folder = folderNameToIdMap[chat.folder];
      }
    });

    // Merge folders and chats
    mergeFoldersAndChats(newFolders, parsedData);
  };

  const handleV1Import = (parsedData: ExportV1) => {
    mergeFoldersAndChats(parsedData.folders, parsedData.chats);
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
  const chats = useStore.getState().chats;
  const folders = useStore.getState().folders;

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

const createFoldersFromLegacy = (chats: ChatInterface[]) => {
  const folderNameToIdMap: Record<string, string> = {};
  const parsedFolders: string[] = [];

  chats.forEach((chat) => {
    if (chat.folder && !parsedFolders.includes(chat.folder)) {
      parsedFolders.push(chat.folder);
      folderNameToIdMap[chat.folder] = uuidv4();
    }
  });

  const newFolders: FolderCollection = parsedFolders.reduce(
    (acc, curr, index) => {
      const id = folderNameToIdMap[curr];
      return {
        ...acc,
        [id]: {
          id,
          name: curr,
          expanded: false,
          order: index,
        },
      };
    },
    {}
  );

  return { folderNameToIdMap, newFolders };
};

const mergeFoldersAndChats = (
  newFolders: FolderCollection,
  newChats: ChatInterface[]
) => {
  const setFolders = useStore.getState().setFolders;
  const setChats = useStore.getState().setChats;

  // Update folder orders
  const currentFolders = useStore.getState().folders;
  const offset = Object.keys(newFolders).length;
  Object.values(currentFolders).forEach((f) => (f.order += offset));

  // Merge folders
  setFolders({ ...newFolders, ...currentFolders });

  // Merge chats
  const currentChats = useStore.getState().chats;
  if (currentChats) {
    setChats([...newChats, ...currentChats]);
  } else {
    setChats(newChats);
  }
};

export default ImportExportChat;
