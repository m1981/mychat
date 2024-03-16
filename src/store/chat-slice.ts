import { StoreSlice } from './store';
import { ChatInterface, FolderCollection, MessageInterface, Folder } from '@type/chat';

export interface ChatSlice {
  messages: MessageInterface[];
  chats?: ChatInterface[];
  currentChatIndex: number;
  generating: boolean;
  error: string;
  folders: FolderCollection;
  currentChatTokenCount: number;
  setMessages: (messages: MessageInterface[]) => void;
  setChats: (chats: ChatInterface[]) => void;
  setCurrentChatIndex: (currentChatIndex: number) => void;
  setGenerating: (generating: boolean) => void;
  setError: (error: string) => void;
  setFolders: (folders: FolderCollection) => void;
  setCurrentChatTokenCount: (tokenCount: number) => void;
  reorderFolders: (updatedFolderOrder: Folder[]) => void;
}

export const createChatSlice: StoreSlice<ChatSlice> = (set, get) => ({
  messages: [],
  currentChatIndex: -1,
  generating: false,
  error: '',
  folders: {},
  currentChatTokenCount: 0,
  setMessages: (messages: MessageInterface[]) => {
    set((prev: ChatSlice) => ({
      ...prev,
      messages: messages,
    }));
  },
  setChats: (chats: ChatInterface[]) => {
    set((prev: ChatSlice) => ({
      ...prev,
      chats: chats,
    }));
  },
  setCurrentChatIndex: (currentChatIndex: number) => {
    set((prev: ChatSlice) => ({
      ...prev,
      currentChatIndex: currentChatIndex,
    }));
  },
  setGenerating: (generating: boolean) => {
    set((prev: ChatSlice) => ({
      ...prev,
      generating: generating,
    }));
  },
  setError: (error: string) => {
    set((prev: ChatSlice) => ({
      ...prev,
      error: error,
    }));
  },
  setFolders: (folders: FolderCollection) => {
    set((prev: ChatSlice) => ({
      ...prev,
      folders: folders,
    }));
  },
  setCurrentChatTokenCount: (tokenCount: number) => {
    set((prev: ChatSlice) => ({
      ...prev,
      currentChatTokenCount: tokenCount,
    }));
  },

  reorderFolders: (updatedFolderOrder: Folder[]) => {
    // Create a new folder collection with updated order
    const reorderedFolders: FolderCollection = {};
    // Assign the new order to the folders
    updatedFolderOrder.forEach((folder, index) => {
      const folderId = folder.id;
      reorderedFolders[folderId] = {
        ...folder,
        order: index, // Update the order based on the array index
      };
    });
    set((state) => ({
      ...state,
      folders: reorderedFolders,
    }));
  },
});
