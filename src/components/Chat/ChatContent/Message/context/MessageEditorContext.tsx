import React, { createContext, useContext } from 'react';
import { MessageEditorContextType } from '../interfaces';

// Create the context with a default value of null
export const MessageEditorContext = createContext<MessageEditorContextType | null>(null);

// Create a custom hook for consuming the context
export function useMessageEditorContext(): MessageEditorContextType {
  const context = useContext(MessageEditorContext);
  if (context === null) {
    throw new Error('useMessageEditorContext must be used within a MessageEditorProvider');
  }
  return context;
}