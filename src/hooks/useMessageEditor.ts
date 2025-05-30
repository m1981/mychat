import { useState, useRef, useCallback } from 'react';

import useStore from '@store/store';

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
  
  // Get the submit function from the useSubmit hook
  const { handleSubmit } = useSubmit();
  
  // Define utility functions first
  const removeSubsequentMessages = useCallback((index: number) => {
    // Get current state to avoid race conditions
    const state = useStore.getState();
    const chats = state.chats;
    const currentChatIndex = state.currentChatIndex;
    
    if (chats && currentChatIndex >= 0 && index >= 0) {
      const updatedChats = JSON.parse(JSON.stringify(chats));
      
      // Remove all messages after the edited message
      if (updatedChats[currentChatIndex].messages) {
        updatedChats[currentChatIndex].messages = 
          updatedChats[currentChatIndex].messages.slice(0, index + 1);
        
        state.setChats(updatedChats);
      }
    }
  }, []);

  const triggerRegeneration = useCallback(async (index: number) => {
    // Trigger regeneration by submitting the current conversation
    await handleSubmit();
  }, [handleSubmit]);
  
  // Handle saving content
  const handleSave = useCallback(() => {
    console.log('handleSave called with:', {
      isComposer,
      messageIndex,
      editContent,
      currentChatIndex: useStore.getState().currentChatIndex,
      messagesCount: useStore.getState().chats[useStore.getState().currentChatIndex]?.messages?.length
    });
    
    // Update the message in the global store
    const state = useStore.getState();
    const chats = state.chats;
    const currentChatIndex = state.currentChatIndex;
    
    if (chats && currentChatIndex >= 0) {
      const updatedChats = JSON.parse(JSON.stringify(chats));
      
      // Ensure messages array exists
      if (!updatedChats[currentChatIndex].messages) {
        updatedChats[currentChatIndex].messages = [];
      }
      
      if (isComposer) {
        // For composer (new message)
        // Check if we're editing an existing message in the composer
        if (messageIndex !== undefined && 
            updatedChats[currentChatIndex].messages[messageIndex]) {
          // Update existing message
          updatedChats[currentChatIndex].messages[messageIndex].content = editContent;
        } else {
          // Append a new user message
          updatedChats[currentChatIndex].messages.push({
            role: 'user',
            content: editContent,
            id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString()
          });
        }
      } else {
        // For editing existing messages
        if (messageIndex !== undefined && 
            updatedChats[currentChatIndex].messages && 
            updatedChats[currentChatIndex].messages[messageIndex]) {
          // Update the existing message
          updatedChats[currentChatIndex].messages[messageIndex].content = editContent;
        } else {
          console.error(
            `Cannot save message: chat or message not found at index ${currentChatIndex}:${messageIndex}`
          );
          return; // Exit early if message not found
        }
      }
      
      // Apply the updates
      state.setChats(updatedChats);
    }
    
    // Exit edit mode if not in composer
    if (!isComposer) {
      setIsEdit(false);
      setIsEditing(false);
    }
  }, [editContent, messageIndex, isComposer, setIsEdit, setIsEditing]);
  
  // Handle save and submit - now defined after the utility functions
  const handleSaveAndSubmit = useCallback(async () => {
    // Save the content first
    handleSave();
    
    if (isComposer) {
      // Submit the message if we're in the composer
      await handleSubmit();
      // Clear the content if we're in the composer
      setEditContent('');
    } else {
      // In edit mode:
      // 1. Update message content (already done by handleSave)
      // 2. Remove subsequent messages
      removeSubsequentMessages(messageIndex);
      // 3. Trigger regeneration
      await triggerRegeneration(messageIndex);
      // 4. Exit edit mode
      setIsEdit(false);
    }
  }, [handleSave, handleSubmit, isComposer, messageIndex, removeSubsequentMessages, setEditContent, setIsEdit, triggerRegeneration]);
  
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
    resetTextAreaHeight,
    removeSubsequentMessages,
    triggerRegeneration
  };
}