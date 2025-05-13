import React from 'react';


import NewFolderIcon from '@icon/NewFolderIcon';
import useStore from '@store/store';
import { Folder, FolderCollection } from '@type/chat';
import { useTranslation } from 'react-i18next';
import { v4 as uuidv4 } from 'uuid';


const NewFolder = () => {
  const { t } = useTranslation();
  const generating = useStore((state) => state.generating);
  const setFolders = useStore((state) => state.setFolders);

  const addFolder = () => {
    let folderIndex = 1;
    let name = `New Folder ${folderIndex}`;

    const folders: FolderCollection = useStore.getState().folders;

    while (Object.values(folders).some((folder: Folder) => folder.name === name)) {
      folderIndex += 1;
      name = `New Folder ${folderIndex}`;
    }

    const updatedFolders: FolderCollection = JSON.parse(
      JSON.stringify(folders)
    );

    const id = uuidv4();
    const newFolder: Folder = {
      id,
      name,
      expanded: false,
      order: 0,
    };

    Object.values(updatedFolders).forEach((folder: Folder) => {
      folder.order += 1;
    });

    setFolders({ [id]: newFolder, ...updatedFolders });
  };

  return (
    <a
  className={`
    max-md:hidden
    flex items-center gap-3 
    py-3 px-3 
    rounded-md
    text-sm text-gray-800 dark:text-gray-100
    md:mb-2 md:border md:border-gray-200 dark:md:border-gray-600
    hover:bg-gray-500/10
    transition-all duration-200
    flex-shrink-0
    select-none
    ${generating ? 'cursor-not-allowed opacity-40' : 'cursor-pointer opacity-100'}
  `}
      onClick={() => {
        if (!generating) addFolder();
      }}
    >
      <NewFolderIcon /> New Folder
    </a>
  );
};

export default NewFolder;
