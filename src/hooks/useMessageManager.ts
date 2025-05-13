import { useCallback } from 'react';

import useStore from '@store/store';
import { ChatInterface } from '@type/chat';

export function useMessageManager() {
  const setChats = useStore(state => state.setChats);
  
  // Clone chats to avoid mutation
  const cloneChats = useCallback((chats: ChatInterface[]): ChatInterface[] => 
    JSON.parse(JSON.stringify(chats)), []);
  
  // Append assistant message
  const appendAssistantMessage = useCallback((
    chats: ChatInterface[],
    chatIndex: number,
    content: string = ''
  ): ChatInterface[] => {
    const updatedChats = cloneChats(chats);
    const messages = updatedChats[chatIndex].messages;
    messages.push({
      role: 'assistant',
      content
    });
    return updatedChats;
  }, [cloneChats]);
  
  // Update message content
  const updateMessageContent = useCallback((
    chats: ChatInterface[],
    chatIndex: number,
    content: string
  ): ChatInterface[] => {
    const updatedChats = cloneChats(chats);
    const messages = updatedChats[chatIndex].messages;
    const lastMessage = messages[messages.length - 1];
    
    if (lastMessage?.role === 'assistant') {
      lastMessage.content += content;
    }
    
    return updatedChats;
  }, [cloneChats]);
  
  // Get store state safely
  const getStoreState = useCallback(() => {
    const state = useStore.getState();
    if (!state.chats || state.currentChatIndex < 0) {
      throw new Error('Invalid store state: chats array or currentChatIndex is invalid');
    }
    return state as { 
      chats: NonNullable<typeof state.chats>,
      currentChatIndex: number,
      [key: string]: any 
    };
  }, []);
  
  return {
    appendAssistantMessage,
    updateMessageContent,
    getStoreState,
    setChats
  };
}