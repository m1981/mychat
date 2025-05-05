import React, { createContext, useContext } from 'react';
import { useMessageEditor } from '@hooks/useMessageEditor';
import { MessageEditorContextType, MessageEditorProviderProps } from '../interfaces';

// Create the context with a default value
const MessageEditorContext = createContext<MessageEditorContextType | undefined>(undefined);

// Custom hook to use the context
export const useMessageEditorContext = () => {
  const context = useContext(MessageEditorContext);
  if (context === undefined) {
    throw new Error('useMessageEditorContext must be used within a MessageEditorProvider');
  }
  return context;
};

// Provider component
export const MessageEditorProvider: React.FC<MessageEditorProviderProps> = ({
  children,
  initialContent,
  messageIndex,
  isComposer,
  setIsEdit,
  setIsEditing,
  focusLine,
}) => {
  // Use the hook to get all the state and methods
  const {
    editContent,
    setEditContent,
    isModalOpen,
    setIsModalOpen,
    textareaRef,
    handleSave,
    handleSaveAndSubmit,
    resetTextAreaHeight,
  } = useMessageEditor({
    initialContent,
    messageIndex,
    isComposer,
    setIsEdit,
    setIsEditing,
  });

  // Create the context value
  const contextValue: MessageEditorContextType = {
    // State
    editContent,
    isModalOpen,
    isEditing: false, // This will be updated by the parent component
    
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
    focusLine,
  };

  return (
    <MessageEditorContext.Provider value={contextValue}>
      {children}
    </MessageEditorContext.Provider>
  );
};

// Export the context for direct access if needed
export default MessageEditorContext;