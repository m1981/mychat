import { useState, useRef, useCallback } from 'react';

import useStore from '@store/store';
import { debug } from '@utils/debug';

import { UseMessageEditorProps, UseMessageEditorReturn } from '../components/Chat/ChatContent/Message/interfaces';

import useSubmit from './useSubmit';

export function useMessageEditor({
  initialContent,
  messageIndex,
  isComposer,
  setIsEdit,
  setIsEditing
}: UseMessageEditorProps): UseMessageEditorReturn {
  // State management
  const [editContent, setEditContent] = useState<string>(initialContent);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Get store state
  const { currentChatIndex, setChats, setEditingMessageIndex } = useStore(state => ({
    currentChatIndex: state.currentChatIndex,
    setChats: state.setChats,
    setEditingMessageIndex: state.setEditingMessageIndex
  }));
  
  // Get the submit function from the useSubmit hook
  const { handleSubmit } = useSubmit();
  
  // Get store state utility function
  const getStoreState = useCallback(() => {
    return useStore.getState();
  }, []);
  
  // Handle saving content
  const handleSave = useCallback((content: string) => {
    debug.log('useSubmit', `[useMessageEditor] Saving message at index ${messageIndex}`);
    
    const currentState = getStoreState();
    const updatedChats = JSON.parse(JSON.stringify(currentState.chats));
    const storeCurrentChatIndex = currentState.currentChatIndex;
    
    debug.log('useSubmit', {
      messageIndex,
      storeCurrentChatIndex,
      chatExists: Boolean(updatedChats[storeCurrentChatIndex]),
      messagesExist: Boolean(updatedChats[storeCurrentChatIndex]?.messages),
      messagesLength: updatedChats[storeCurrentChatIndex]?.messages?.length || 0
    });
    
    // Check if we need to append a new message instead of updating
    if (messageIndex >= (updatedChats[storeCurrentChatIndex]?.messages?.length || 0)) {
      // We're trying to save a message that doesn't exist yet - append it
      debug.log('useMessageEditor', `[useMessageEditor] Appending new message at index ${messageIndex}`);
      
      if (!updatedChats[storeCurrentChatIndex].messages) {
        updatedChats[storeCurrentChatIndex].messages = [];
      }
      
      updatedChats[storeCurrentChatIndex].messages.push({
        role: 'user',
        content: content
      });
      
      setChats(updatedChats);
      
      // Exit edit mode if possible
      if (typeof setEditingMessageIndex === 'function') {
        setEditingMessageIndex(-1);
      }
      
      return;
    }
    
    // Now it's safe to update an existing message
    updatedChats[storeCurrentChatIndex].messages[messageIndex].content = content;
    setChats(updatedChats);
    
    // Exit edit mode if possible
    if (typeof setEditingMessageIndex === 'function') {
      setEditingMessageIndex(-1);
    }
  }, [messageIndex, setChats, setEditingMessageIndex, getStoreState, isComposer]);
  
  // Handle save and submit
  const handleSaveAndSubmit = useCallback(async () => {
    // Save the content first
    handleSave(editContent);
    
    // Clear the content immediately after saving
    if (isComposer) {
      setEditContent('');
    }
    
    // Submit the message if we're in the composer
    if (isComposer) {
      await handleSubmit();
    }
  }, [handleSave, handleSubmit, isComposer, setEditContent, editContent]);
  
  // Handle textarea height adjustments
  const resetTextAreaHeight = useCallback(() => {
    if (textareaRef.current) {
      // Reset height logic
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, []);
  
  // Return all state and methods
  return {
    editContent,
    setEditContent,
    isModalOpen,
    setIsModalOpen,
    textareaRef,
    handleSave,
    handleSaveAndSubmit,
    resetTextAreaHeight
  };
}