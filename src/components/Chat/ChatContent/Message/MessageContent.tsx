import React from 'react';
import { Role } from '@type/chat';
import ContentView from './ViewMode/ContentView';
import EditView from './EditMode/EditView';
import { MessageEditorProvider } from './context/MessageEditorContext';
import { MessageContentProps } from './interfaces';

const MessageContent: React.FC<MessageContentProps> = ({
  content,
  messageIndex,
  isComposer = false,
  isEdit,
  setIsEdit,
  isEditing,
  setIsEditing,
  focusLine,
}) => {
  // Add keyboard event handler at component level
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isEdit && !isComposer) {
        e.preventDefault();
        setIsEdit(false);
      }
    };

    // Add the event listener
    document.addEventListener('keydown', handleKeyDown);

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isEdit, isComposer, setIsEdit]);

  return (
    <div 
      className='relative flex flex-col gap-1 md:gap-3 lg:w-[calc(100%)]'
      tabIndex={isEdit ? 0 : -1}
    >
      {isEdit ? (
        <MessageEditorProvider
          initialContent={content}
          messageIndex={messageIndex}
          isComposer={isComposer}
          setIsEdit={setIsEdit}
          setIsEditing={setIsEditing}
          focusLine={focusLine}
        >
          <EditView />
        </MessageEditorProvider>
      ) : (
        <ContentView content={content} />
      )}
    </div>
  );
};

export default MessageContent;