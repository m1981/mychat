import React, { useEffect, useRef, useState } from 'react';
import { DragDropContext, Droppable, DropResult, DroppableProvided } from 'react-beautiful-dnd';
import useStore from '@store/store';
import { shallow } from 'zustand/shallow';
import { Folder } from '@type/chat';
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
      .sort((a, b) => (a as Folder).order - (b as Folder).order)
      .forEach((f) => (_folders[(f as Folder).id] = []));

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
          _noFolders.push({ title: chat.title, index: index, id: chat.id, order: 0 });
        } else {
          if (!_folders[chat.folder]) _folders[_chatFolderName] = [];
          _folders[chat.folder].push({
            title: chat.title,
            index: index,
            id: chat.id,
            order: 0,
          });
        }
      });
    }

    setChatFolders(_folders);
    setNoChatFolders(_noFolders);
  }).current;

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


  // Function to handle the drop event for dropping chats into folders
  const handleChatDrop = (e: React.DragEvent<HTMLDivElement>) => {
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

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const { source, destination } = result;
    if (source.droppableId === destination.droppableId) {
      const folderIds = Object.keys(chatFolders);
      const updatedFolderOrder = [...folderIds];
      const [reorderedFolderId] = updatedFolderOrder.splice(source.index, 1);
      updatedFolderOrder.splice(destination.index, 0, reorderedFolderId);

      const updatedFolders: Folder[] = updatedFolderOrder.map((folderId) => ({
        ...chatFolders[folderId as string],
        order: chatFolders[folderId as string].order,
      }));
      reorderFolders(updatedFolders);
    }
  };


  return (
    <div className={`flex-col flex-1 overflow-y-auto hide-scroll-bar border-b border-white/20`}>
      <ChatSearch filter={filter} setFilter={setFilter} />
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="chat-history-list">
         {(provided: DroppableProvided) => (
            <div {...provided.droppableProps} ref={provided.innerRef}>
              {Object.keys(chatFolders)
                .sort((a, b) => chatFolders[a as string].order - chatFolders[b as string].order)
                .map((folderId, index) => (
                  <ChatFolder
                    folderChats={chatFolders[folderId]}
                    folderId={folderId}
                    key={folderId}
                    index={index}
                  />
                ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
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
