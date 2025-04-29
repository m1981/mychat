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

// Separate filtering logic
const filterChatsByTitle = (
  chats: ChatInterface[] | undefined,
  filterText: string,
  currentChatIndex: number
): ChatInterface[] => {
  console.log('[filterChatsByTitle] Input:', {
    totalChats: chats?.length,
    filterText,
    currentChatIndex
  });

  if (!chats) {
    console.log('[filterChatsByTitle] No chats available');
    return [];
  }

  if (!filterText.trim()) {
    console.log('[filterChatsByTitle] No filter text, returning all chats');
    return chats;
  }

  const _filterLowerCase = filterText.toLowerCase();
  const filteredChats = chats.filter((chat) => {
    const titleMatch = chat.title.toLowerCase().includes(_filterLowerCase);
    const contentMatch = chat.messages?.some(msg => 
      msg.content?.toLowerCase().includes(_filterLowerCase)
    );
    
    return titleMatch || contentMatch;
  });

  console.log('[filterChatsByTitle] Filtered results:', {
    filterText: _filterLowerCase,
    matchedChats: filteredChats.map(c => ({
      title: c.title,
      hasContentMatch: c.messages?.some(msg => 
        msg.content?.toLowerCase().includes(_filterLowerCase)
      )
    })),
    totalMatches: filteredChats.length
  });

  return filteredChats;
};

// Define local interfaces that don't conflict with imports
interface ChatHistoryItem {
  title: string;
  index: number;
  id: string;
}

interface ChatHistoryFolderMap {
  [key: string]: ChatHistoryItem[];
}

interface ChatHistoryListProps {
  searchFilter: string;
  onSearchChange: (filter: string) => void;
}

const ChatHistoryList = ({ searchFilter, onSearchChange }: ChatHistoryListProps) => {
  console.log('[ChatHistoryList] Received searchFilter:', searchFilter);

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
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const chatsRef = useRef<ChatInterface[]>(useStore.getState().chats || []);
  const foldersRef = useRef<FolderCollection>(useStore.getState().folders);
  const filterRef = useRef<string>(searchFilter);

  // Update filterRef when searchFilter changes
  useEffect(() => {
    filterRef.current = searchFilter;
    updateFolders();
  }, [searchFilter]);

  const updateFolders = useRef(() => {
    try {
      setIsLoading(true);
      setError(null);

      const _folders: ChatHistoryFolderMap = {};
      const _noFolders: ChatHistoryItem[] = [];
      const chats = useStore.getState().chats;
      const folders = useStore.getState().folders;

      if (!chats) {
        throw new Error('No chats available');
      }

      // First, filter the chats
      const filteredChats = filterChatsByTitle(chats, filterRef.current, currentChatIndex);

      // Initialize folders only if they exist
      if (folders) {
        (Object.values(folders) as Folder[])
          .sort((a, b) => a.order - b.order)
          .forEach((f) => (_folders[f.id] = []));
      }

      // Organize filtered chats into folders
      filteredChats.forEach((chat: ChatInterface, index: number) => {
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

      setChatFolders(_folders);
      setNoChatFolders(_noFolders);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while updating folders');
    } finally {
      setIsLoading(false);
    }
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

  if (error) {
    return (
      <div className="flex-1 overflow-y-auto p-2">
        <div className="text-red-500 text-sm bg-red-100 dark:bg-red-900/50 p-2 rounded">
          {error}
        </div>
      </div>
    );
  }

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
      {isLoading ? (
        <div className="flex items-center justify-center py-4">
          <div className="animate-pulse text-gray-500 dark:text-gray-400">
            Loading chats...
          </div>
        </div>
      ) : (
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
          {!isLoading && noChatFolders.length === 0 && Object.keys(chatFolders).length === 0 && (
            <div className="text-center py-4 text-gray-500 dark:text-gray-400">
              No chats found
            </div>
          )}
        </div>
      )}
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
