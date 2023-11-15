import React, { useEffect, useRef, useState } from 'react';
import useStore from '@store/store';
import { shallow } from 'zustand/shallow';

import ChatFolder from './ChatFolder';
import ChatHistory from './ChatHistory';
import ChatSearch from './ChatSearch';

import {
  ChatHistoryInterface,
  ChatHistoryFolderInterface,
  ChatInterface,
  FolderCollection,
} from '@type/chat';

const ChatHistoryList = () => {
  const currentChatIndex = useStore((state) => state.currentChatIndex);
  const setChats = useStore((state) => state.setChats);
  const setFolders = useStore((state) => state.setFolders);
  const chatTitles = useStore(
    (state) => state.chats?.map((chat) => chat.title),
    shallow
  );

  const [isHover, setIsHover] = useState<boolean>(false);
  const [chatFolders, setChatFolders] = useState<ChatHistoryFolderInterface>(
    {}
  );
  const [noChatFolders, setNoChatFolders] = useState<ChatHistoryInterface[]>(
    []
  );
  const [filter, setFilter] = useState<string>('');

  const chatsRef = useRef<ChatInterface[]>(useStore.getState().chats || []);
  const foldersRef = useRef<FolderCollection>(useStore.getState().folders);
  const filterRef = useRef<string>(filter);

  const updateFolders = useRef(() => {
    const _folders: ChatHistoryFolderInterface = {};
    const _noFolders: ChatHistoryInterface[] = [];
    const chats = useStore.getState().chats;
    const folders = useStore.getState().folders;

    Object.values(folders)
      .sort((a, b) => a.order - b.order)
      .forEach((f) => (_folders[f.id] = []));

    if (chats) {
      chats.forEach((chat, index) => {
        const _filterLowerCase = filterRef.current.toLowerCase();
        const _chatTitle = chat.title.toLowerCase();
        const _chatFolderName = chat.folder
          ? folders[chat.folder].name.toLowerCase()
          : '';

        if (
          !_chatTitle.includes(_filterLowerCase) &&
          !_chatFolderName.includes(_filterLowerCase) &&
          index !== useStore.getState().currentChatIndex
        )
          return;

        if (!chat.folder) {
          _noFolders.push({ title: chat.title, index: index, id: chat.id });
        } else {
          if (!_folders[chat.folder]) _folders[_chatFolderName] = [];
          _folders[chat.folder].push({
            title: chat.title,
            index: index,
            id: chat.id,
          });
        }
      });
    }

    setChatFolders(_folders);
    setNoChatFolders(_noFolders);
  }).current;



  const reorderFolders = useStore((state) => state.reorderFolders);
  const folders = useStore((state) => state.folders);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();

    // Retrieve the dragged folder ID from the data transfer object
    const draggedFolderId = e.dataTransfer.getData('folderId');

    // Assuming 'e.target' is your placeholder or visual indicator element
    const targetElement = e.target as HTMLElement;
    const targetFolderId = targetElement.getAttribute('data-folder-id');

    // Find the index of the dragged folder and the target folder
    const folderList = Object.entries(folders).sort((a, b) => a[1].order - b[1].order);
    const draggedFolderIndex = folderList.findIndex(([id]) => id === draggedFolderId);
    const targetIndex = folderList.findIndex(([id]) => id === targetFolderId);

    if (draggedFolderIndex === -1 || targetIndex === -1 || draggedFolderIndex === targetIndex) {
      return; // Invalid drop, ignore
    }

    // Remove the dragged folder from the array
    const [removed] = folderList.splice(draggedFolderIndex, 1);
    // Insert it at the position of the target
    folderList.splice(targetIndex, 0, removed);

    // Update the order property of each folder
    const reorderedFolders = folderList.map(([id, folder], index) => ({
      ...folder,
      order: index
    }));

    // Create a new folder collection with updated order
    const reorderedFoldersCollection = reorderedFolders.reduce((acc, folder) => {
      acc[folder.id] = folder;
      return acc;
    }, {});

    reorderFolders(reorderedFoldersCollection);
  };



  useEffect(() => {
    updateFolders();

    useStore.subscribe((state) => {
      if (
        !state.generating &&
        state.chats &&
        state.chats !== chatsRef.current
      ) {
        updateFolders();
        chatsRef.current = state.chats;
      } else if (state.folders !== foldersRef.current) {
        updateFolders();
        foldersRef.current = state.folders;
      }
    });
  }, []);

  useEffect(() => {
    if (
      chatTitles &&
      currentChatIndex >= 0 &&
      currentChatIndex < chatTitles.length
    ) {
      // set title
      document.title = chatTitles[currentChatIndex];

      // expand folder of current chat
      const chats = useStore.getState().chats;
      if (chats) {
        const folderId = chats[currentChatIndex].folder;

        if (folderId) {
          const updatedFolders: FolderCollection = JSON.parse(
            JSON.stringify(useStore.getState().folders)
          );

          updatedFolders[folderId].expanded = true;
          setFolders(updatedFolders);
        }
      }
    }
  }, [currentChatIndex, chatTitles]);

  useEffect(() => {
    filterRef.current = filter;
    updateFolders();
  }, [filter]);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    if (e.dataTransfer) {
      e.stopPropagation();
      setIsHover(false);

      const chatIndex = Number(e.dataTransfer.getData('chatIndex'));
      const updatedChats: ChatInterface[] = JSON.parse(
        JSON.stringify(useStore.getState().chats)
      );
      delete updatedChats[chatIndex].folder;
      setChats(updatedChats);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsHover(true);
  };

  const handleDragLeave = () => {
    setIsHover(false);
  };

  const handleDragEnd = () => {
    setIsHover(false);
  };

  return (
    <div
      className={`flex-col flex-1 overflow-y-auto hide-scroll-bar border-b border-white/20 ${
        isHover ? 'bg-gray-800/40' : ''
      }`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDragEnd={handleDragEnd}
    >
      <ChatSearch filter={filter} setFilter={setFilter} />
      <div className='flex flex-col gap-2 text-gray-100 text-sm'>
        {Object.keys(chatFolders).sort((a, b) => folders[a].order - folders[b].order).map((folderId, index, array) => (
          <>
            {/* Drop indicator before the folder */}
            {index > 0 && (
              <div
                className="drop-indicator"
                data-folder-id={folderId}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                style={{ height: '20px', backgroundColor: 'lightgrey' }} // Style as needed
              />
            )}
            <ChatFolder
              folderChats={chatFolders[folderId]}
              folderId={folderId}
              key={folderId}
              // ... other props ...
            />
            {/* Drop indicator after the folder, if it's the last folder */}
            {index === array.length - 1 && (
              <div
                className="drop-indicator"
                data-folder-id={folderId}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                style={{ height: '20px', backgroundColor: 'lightgrey' }} // Style as needed
              />
            )}
          </>
        ))}
        {noChatFolders.map(({ title, index, id }) => (
          <ChatHistory title={title} key={`${title}-${id}`} chatIndex={index} />
        ))}
      </div>
      <div className='w-full h-10' />
    </div>
  );
};

const ShowMoreButton = () => {
  return (
    <button className='btn relative btn-dark btn-small m-auto mb-2'>
      <div className='flex items-center justify-center gap-2'>Show more</div>
    </button>
  );
};

export default ChatHistoryList;
