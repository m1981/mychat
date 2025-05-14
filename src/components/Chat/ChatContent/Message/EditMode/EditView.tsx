import React, { useEffect } from 'react';

import PopupModal from '@components/PopupModal';
import { useMessageEditorContext } from '@components/Chat/ChatContent/Message/context/MessageEditorContext';
import { EditViewProps } from '@components/Chat/ChatContent/Message/interfaces';
import { useFileDropHandler } from '@hooks/useFileDropHandler';
import { useKeyboardShortcuts } from '@hooks/useKeyboardShortcuts';
import { usePasteHandler } from '@hooks/usePasteHandler';
import { useTextareaFocus } from '@hooks/useTextareaFocus';
import { useTextSelection } from '@hooks/useTextSelection';
import { useTranslation } from 'react-i18next';
import { debug } from '@utils/debug';

import EditViewButtons from './EditViewButtons';

/**
 * EditView component - Provides the editing interface for message content
 */
const EditView: React.FC<EditViewProps> = ({ customKeyHandler }) => {
  const { t } = useTranslation();
  
  const {
    editContent,
    setEditContent,
    textareaRef,
    isModalOpen,
    setIsModalOpen,
    handleSaveAndSubmitWithTruncation,
    handleModalCancel,
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
      cursorAtEnd: false,
      debugId: 'edit-view-textarea'
    }
  );

  // Set up text selection tracking
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
      
      {isModalOpen && (
        <PopupModal
          setIsModalOpen={setIsModalOpen}
          title={t('warning') || 'Warning'}
          message={t('clearMessageWarning') || 'This will clear all subsequent messages. Continue?'}
          handleConfirm={handleSaveAndSubmitWithTruncation}
          handleClose={() => {
            debug.log('focus', '[EditView] Modal close handler called');
            handleModalCancel();
          }}
        />
      )}
    </div>
  );
};

export default EditView;