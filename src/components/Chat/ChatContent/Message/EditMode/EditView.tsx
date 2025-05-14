import React, { useEffect } from 'react';

import { useMessageEditorContext } from '@components/Chat/ChatContent/Message/context/MessageEditorContext';
import { EditViewProps } from '@components/Chat/ChatContent/Message/interfaces';
import { useFileDropHandler } from '@hooks/useFileDropHandler';
import { useKeyboardShortcuts } from '@hooks/useKeyboardShortcuts';
import { usePasteHandler } from '@hooks/usePasteHandler';
import { useTextareaFocus } from '@hooks/useTextareaFocus';
import { useTextSelection } from '@hooks/useTextSelection';

import EditViewButtons from './EditViewButtons';

/**
 * EditView component - Provides the editing interface for message content
 */
const EditView: React.FC<EditViewProps> = ({ customKeyHandler }) => {
  const {
    editContent,
    setEditContent,
    textareaRef,
    // Remove unused variables but keep them in destructuring to maintain the structure
    // isComposer and focusLine are used by other components via context
    resetTextAreaHeight
  } = useMessageEditorContext();

  // Set up keyboard shortcuts
  const { handleKeyDown } = useKeyboardShortcuts({
    customKeyHandler
  });

  // Set up paste handler
  const { handlePaste } = usePasteHandler({
    onContentUpdate: setEditContent
  });

  // Set up file drop handler
  const { handleDrop } = useFileDropHandler({
    onContentUpdate: setEditContent,
    currentContent: editContent
  });

  // Set up textarea focus and cursor positioning
  useTextareaFocus(
    textareaRef,
    {
      scrollIntoView: true,
      cursorAtEnd: false, // Set to false to use end of first line
      debugId: 'edit-view-textarea',
      refocusOnScroll: false
    }
  );

  // Set up text selection tracking
  // Add a default value to prevent destructuring errors
  useTextSelection({
    textareaRef
  });

  // Auto-resize textarea as content changes
  useEffect(() => {
    if (textareaRef.current) {
      resetTextAreaHeight();
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [editContent, resetTextAreaHeight, textareaRef]);

  return (
    <div className="w-full flex flex-col">
      <textarea
        ref={textareaRef}
        className="w-full resize-none overflow-hidden bg-transparent dark:bg-transparent p-0 focus:ring-0 focus-visible:ring-0 border-0 focus:outline-none shadow-none dark:shadow-none"
        value={editContent}
        onChange={(e) => setEditContent(e.target.value)}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onDrop={handleDrop}
        rows={1}
        placeholder="Type your message here..."
        data-testid="edit-textarea"
      />
      
      <EditViewButtons />
    </div>
  );
};

export default EditView;