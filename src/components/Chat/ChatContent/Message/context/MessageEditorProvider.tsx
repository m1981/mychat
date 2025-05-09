import React from 'react';
import { MessageEditorContext } from './MessageEditorContext';
import { MessageEditorProviderProps, MessageEditorContextType } from '../interfaces';
import { useMessageEditor } from '@hooks/useMessageEditor';

export function MessageEditorProvider({
  children,
  initialContent,
  messageIndex,
  isComposer,
  setIsEdit,
  setIsEditing,
  focusLine
}: MessageEditorProviderProps): JSX.Element {
  // Use the hook to get all state and methods
  const {
    editContent,
    setEditContent,
    isModalOpen,
    setIsModalOpen,
    textareaRef,
    handleSave,
    handleSaveAndSubmit,
    resetTextAreaHeight
  } = useMessageEditor({
    initialContent,
    messageIndex,
    isComposer,
    setIsEdit,
    setIsEditing
  });
  
  // Create the complete context value
  const contextValue: MessageEditorContextType = {
    // State
    editContent,
    isModalOpen,
    isEditing: true, // Set to true when provider is active
    
    // Setters
    setEditContent,
    setIsModalOpen,
    setIsEdit,
    
    // Refs
    textareaRef,
    
    // Actions
    handleSave,
    handleSaveAndSubmit,
    resetTextAreaHeight,
    
    // Metadata
    messageIndex,
    isComposer,
    focusLine
  };
  
  // Provide the context to children
  return (
    <MessageEditorContext.Provider value={contextValue}>
      {children}
    </MessageEditorContext.Provider>
  );
}