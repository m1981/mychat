import { useState, useRef, useCallback } from 'react';

import useStore from '@store/store';
import { debug } from '@utils/debug';

import { UseMessageEditorProps, UseMessageEditorReturn } from '../components/Chat/ChatContent/Message/interfaces';

import { useSubmit } from './useSubmit';

// Declare setTimeout for ESLint
declare const setTimeout: (callback: () => void, ms: number) => number;
// Declare navigator for ESLint if needed in this file

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
  const { setChats } = useStore(state => ({
    setChats: state.setChats
  }));

  // Create a fallback for setEditingMessageIndex
  const setEditingMessageIndex = useCallback((_: number) => {
    // This is a no-op fallback in case the store doesn't have this function
  }, []);
  
  // Get the submit function from the useSubmit hook
  const { handleSubmit } = useSubmit();
  
  // Get store state utility function
  const getStoreState = useCallback(() => {
    return useStore.getState();
  }, []);
  
  // Handle saving content
  const handleSave = useCallback(() => {
    debug.log('useSubmit', `[useMessageEditor] Saving message at index ${messageIndex}`);
    
    // Ensure content is never undefined
    const safeContent = editContent || '';
    
    const currentState = getStoreState();
    
    // Validate store state
    if (!currentState || !currentState.chats) {
      debug.error('store', '[useMessageEditor] Store state is invalid:', currentState);
      return;
    }
    
    const storeCurrentChatIndex = currentState.currentChatIndex;
    const updatedChats = JSON.parse(JSON.stringify(currentState.chats));
    
    // Ensure messages array exists
    if (!updatedChats[storeCurrentChatIndex].messages) {
      updatedChats[storeCurrentChatIndex].messages = [];
    }
    
    // Check if we need to append a new message instead of updating
    if (messageIndex >= updatedChats[storeCurrentChatIndex].messages.length) {
      // We're trying to save a message that doesn't exist yet - append it
      debug.log('chat', `[useMessageEditor] Appending new message at index ${messageIndex}`);
      
      updatedChats[storeCurrentChatIndex].messages.push({
        role: 'user',
        content: safeContent
      });
      
      setChats(updatedChats);
      
      // Exit edit mode if possible
      if (typeof setEditingMessageIndex === 'function') {
        setEditingMessageIndex(-1);
      }
      
      return;
    }
    
    // Now it's safe to update an existing message
    updatedChats[storeCurrentChatIndex].messages[messageIndex].content = safeContent;
    setChats(updatedChats);
    
    // Exit edit mode if possible
    if (typeof setEditingMessageIndex === 'function') {
      setEditingMessageIndex(-1);
    }
    
    // Close edit mode
    setIsEdit(false);
  }, [messageIndex, setChats, setEditingMessageIndex, getStoreState, isComposer, editContent, setIsEdit]);
  
  // Handle save and submit with truncation of subsequent messages
  const handleSaveAndSubmitWithTruncation = useCallback(async () => {
    debug.log('useSubmit', `[useMessageEditor] Saving and submitting with truncation at index ${messageIndex}`);
    
    // Ensure content is never undefined
    const safeContent = editContent || '';
    
    const currentState = getStoreState();
    
    // Validate store state
    if (!currentState || !currentState.chats) {
      debug.error('store', '[useMessageEditor] Store state is invalid:', currentState);
      return;
    }
    
    const storeCurrentChatIndex = currentState.currentChatIndex;
    const updatedChats = JSON.parse(JSON.stringify(currentState.chats));
    
    // Update the message content
    updatedChats[storeCurrentChatIndex].messages[messageIndex].content = safeContent;
    
    // Truncate subsequent messages - keep only up to the current message
    updatedChats[storeCurrentChatIndex].messages =
      updatedChats[storeCurrentChatIndex].messages.slice(0, messageIndex + 1);
    
    // Update state and wait for it to complete
    await new Promise<void>(resolve => {
      setChats(updatedChats);
      // Use a small timeout to ensure state is updated
      setTimeout(resolve, 50);
    });
    
    // Exit edit mode
    setIsEdit(false);
    setIsEditing(false);
    
    // Close the modal
    setIsModalOpen(false);
    
    // Now submit with updated state to regenerate AI response
    await handleSubmit();
  }, [messageIndex, setChats, getStoreState, editContent, setIsEdit, setIsEditing, handleSubmit]);
  
  // Handle save and submit
  const handleSaveAndSubmit = useCallback(async () => {
    // If we're in composer mode, just save and submit
    if (isComposer) {
      // Save the content first
      handleSave();
      
      // Clear the content immediately after saving
      setEditContent('');
      
      // Submit the message
      await handleSubmit();
    } else {
      // If we're editing an existing message, show confirmation modal
      setIsModalOpen(true);
    }
  }, [handleSave, handleSubmit, isComposer, setEditContent]);

  // Handle modal cancellation
  const handleModalCancel = useCallback(() => {
    debug.log('focus', '[useMessageEditor] Modal cancel called, closing modal');
    setIsModalOpen(false);
    
    // Return focus to textarea after modal closes
    setTimeout(() => {
      debug.log('focus', '[useMessageEditor] Attempting to restore focus after modal close');
      
      if (textareaRef.current) {
        debug.log('focus', '[useMessageEditor] Textarea ref exists, focusing');
        textareaRef.current.focus();
        
        // Try to restore cursor position if possible
        const length = textareaRef.current.value.length;
        textareaRef.current.setSelectionRange(length, length);
        debug.log('focus', `[useMessageEditor] Set cursor position to end (${length})`);
      } else {
        debug.log('focus', '[useMessageEditor] Textarea ref is null, cannot focus');
      }
    }, 100); // Increase timeout to ensure modal is fully closed
  }, []);
  
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
    handleSaveAndSubmitWithTruncation,
    resetTextAreaHeight,
    handleModalCancel
  };
}