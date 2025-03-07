import React, { useEffect, useRef, useState } from 'react';
import { DragDropContext, Droppable, DropResult } from 'react-beautiful-dnd';
import { shallow } from 'zustand/shallow';

import useStore from '@store/store';
import {
  ChatInterface,
  Folder,
  FolderCollection,
} from '@type/chat';

import ChatFolder from './ChatFolder';
import ChatHistory from './ChatHistory';
import ChatSearch from './ChatSearch';


// Define local interfaces that don't conflict with imports
interface ChatHistoryItem {
  title: string;
  index: number;
  id: string;
}

interface ChatHistoryFolderMap {
  [key: string]: ChatHistoryItem[];
}

const ChatHistoryList = () => {
  const currentChatIndex = useStore((state) => state.currentChatIndex);
  const setChats = useStore((state) => state.setChats);
  const setFolders = useStore((state) => state.setFolders);
  const chatTitles = useStore(
    (state) => state.chats?.map((chat: ChatInterface) => chat.title),
    shallow
  );

  const [isHover, setIsHover] = useState<boolean>(false);
  const [chatFolders, setChatFolders] = useState<ChatHistoryFolderMap>({});
  const [noChatFolders, setNoChatFolders] = useState<ChatHistoryItem[]>([]);
  const [filter, setFilter] = useState<string>('');

  const chatsRef = useRef<ChatInterface[]>(useStore.getState().chats || []);
  const foldersRef = useRef<FolderCollection>(useStore.getState().folders);
  const filterRef = useRef<string>(filter);

  const updateFolders = useRef(() => {
    const _folders: ChatHistoryFolderMap = {};
    const _noFolders: ChatHistoryItem[] = [];
    const chats = useStore.getState().chats;
    const folders = useStore.getState().folders;

    // Initialize folders only if they exist
    if (folders) {
      (Object.values(folders) as Folder[])
        .sort((a, b) => a.order - b.order)
        .forEach((f) => (_folders[f.id] = []));
    }

    if (chats) {
      chats.forEach((chat: ChatInterface, index: number) => {
        const _filterLowerCase = filterRef.current.toLowerCase();
        const _chatTitle = chat.title.toLowerCase();
        const _chatFolderName = chat.folder && folders && folders[chat.folder]
          ? folders[chat.folder].name.toLowerCase()
          : '';

        if (
          !_chatTitle.includes(_filterLowerCase) &&
          !_chatFolderName.includes(_filterLowerCase) &&
          index !== useStore.getState().currentChatIndex
        )
          return;

        if (!chat.folder || !folders || !folders[chat.folder]) {
          _noFolders.push({ title: chat.title, index: index, id: chat.id });
        } else {
          if (!_folders[chat.folder]) _folders[chat.folder] = [];
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
    if (!chatTitles || currentChatIndex < 0 || currentChatIndex >= chatTitles.length) {
      return;
    }

    // Always update document title for current chat
    document.title = chatTitles[currentChatIndex];

    // Handle folder expansion
    const chats = useStore.getState().chats;
    const folders = useStore.getState().folders;
    if (!chats?.[currentChatIndex]) return;

    const folderId = chats[currentChatIndex].folder;
    if (!folderId || !folders) return;

    // If chat belongs to a folder, ensure it's expanded
    const updatedFolders: FolderCollection = {
      ...folders,
      [folderId]: {
        ...folders[folderId],
        expanded: true
      }
    };

    // Only update if the folder exists and its state actually changed
    if (folders[folderId] && !folders[folderId].expanded) {
      setFolders(updatedFolders);
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


  const handleFolderDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const { source, destination } = result;
    const newFolderOrder = Array.from(Object.keys(chatFolders));
    const [reorderedFolder] = newFolderOrder.splice(source.index, 1);
    newFolderOrder.splice(destination.index, 0, reorderedFolder);

    const updatedFolders: FolderCollection = {};
    newFolderOrder.forEach((folderId: string, index: number) => {
      updatedFolders[folderId] = {
        ...useStore.getState().folders[folderId],
        order: index,
      };
    });

    setFolders(updatedFolders);
  };


  return (
    <div
      className={`flex-col flex-1 overflow-y-auto hide-scroll-bar ${
        isHover ? 'bg-gray-800/40' : ''
      }`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDragEnd={handleDragEnd}
    >
      <ChatSearch filter={filter} setFilter={setFilter} />
      <div className="flex flex-col gap-2 text-gray-100 text-sm">
        <DragDropContext onDragEnd={handleFolderDragEnd}>
          <Droppable droppableId="folders">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="flex flex-col gap-1"
              >
                {Object.keys(chatFolders).map((folderId, index) => (
                  <ChatFolder
                    key={folderId}
                    folderChats={chatFolders[folderId]}
                    folderId={folderId}
                  />
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      {noChatFolders.map(({ title, index, id }) => (
        <ChatHistory title={title} key={`${title}-${id}`} chatIndex={index} />
      ))}
      </div>
      <div className="w-full h-10" />
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
