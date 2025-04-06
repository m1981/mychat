import { DEFAULT_CHATS } from '@constants/chat';
import { ChatInterface, FolderCollection, MessageInterface } from '@type/chat';

import { StoreSlice } from './store';

export interface ChatSlice {
  messages: MessageInterface[];
  chats?: ChatInterface[];
  currentChatIndex: number;
  generating: boolean;
  error: string | null;
  folders: FolderCollection;
  currentChatTokenCount: number;
  setMessages: (messages: MessageInterface[]) => void;
  setChats: (chats: ChatInterface[]) => void;
  setCurrentChatIndex: (index: number) => void;
  setGenerating: (generating: boolean) => void;
  setError: (error: string | null) => void;
  setFolders: (folders: FolderCollection) => void;
  setCurrentChatTokenCount: (tokenCount: number) => void;
}

export const createChatSlice: StoreSlice<ChatSlice> = (set, get) => ({
  folders: {},
  messages: [],
  chats: DEFAULT_CHATS,
  currentChatIndex: 0,
  generating: false,
  error: null,
  currentChatTokenCount: 0,
  setMessages: (messages: MessageInterface[]) => {
    set((prev: ChatSlice) => ({
      ...prev,
      messages,
    }));
  },
  setChats: (chats: ChatInterface[]) => {
    set((prev: ChatSlice) => ({
      ...prev,
      chats,
    }));
  },
  setCurrentChatIndex: (index: number) => {
    set((prev: ChatSlice) => ({
      ...prev,
      currentChatIndex: index,
    }));
  },
  setGenerating: (generating: boolean) => {
    set((prev: ChatSlice) => ({
      ...prev,
      generating,
    }));
  },
  setError: (error: string | null) => {
    set((prev: ChatSlice) => ({
      ...prev,
      error,
    }));
  },
  setFolders: (folders: FolderCollection) => {
    set((prev: ChatSlice) => ({
      ...prev,
      folders,
    }));
  },
  setCurrentChatTokenCount: (tokenCount: number) => {
    set((prev: ChatSlice) => ({
      ...prev,
      currentChatTokenCount: tokenCount,
    }));
  },
});
