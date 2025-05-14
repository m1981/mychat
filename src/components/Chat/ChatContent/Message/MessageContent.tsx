import React from 'react';

import { MessageEditorProvider } from './context/MessageEditorContext';
import EditView from './EditMode/EditView';
import { MessageContentProps } from './interfaces';
import ContentView from './ViewMode/ContentView';

const MessageContent: React.FC<MessageContentProps> = ({
  content,
  messageIndex,
  isComposer = false,
  isEdit,
  setIsEdit,
  // Remove isEditing from destructuring since it's not used
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