import { useState, useRef, useCallback, RefObject } from 'react';
import { UseMessageEditorProps, UseMessageEditorReturn } from '../components/Chat/ChatContent/Message/interfaces';
import useStore from '@store/store';

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
  
  // Access global store
  const { updateMessage, submitMessage } = useStore();
  
  // Handle saving content
  const handleSave = useCallback(() => {
    // Update the message in the global store
    updateMessage(messageIndex, editContent);
    
    // Exit edit mode if not in composer
    if (!isComposer) {
      setIsEdit(false);
      setIsEditing(false);
    }
  }, [editContent, messageIndex, isComposer, setIsEdit, setIsEditing, updateMessage]);
  
  // Handle save and submit
  const handleSaveAndSubmit = useCallback(async () => {
    // Save the content first
    handleSave();
    
    // Submit the message if we're in the composer
    if (isComposer) {
      await submitMessage(editContent);
    }
    
    // Clear the content if we're in the composer
    if (isComposer) {
      setEditContent('');
    }
  }, [handleSave, submitMessage, editContent, isComposer, setEditContent]);
  
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