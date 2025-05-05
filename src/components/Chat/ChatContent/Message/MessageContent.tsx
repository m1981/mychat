import React, { useEffect } from 'react';
import { Role } from '@type/chat';

import ContentView from './ViewMode/ContentView';

export interface MessageContentProps {
  role: Role;
  content: string;
  messageIndex: number;
  isComposer: boolean;
  isEdit: boolean;
  setIsEdit: React.Dispatch<React.SetStateAction<boolean>>;
  isEditing: boolean;
  setIsEditing: React.Dispatch<React.SetStateAction<boolean>>;
}

const MessageContent: React.FC<MessageContentProps> = ({
  content,
  messageIndex,
  isComposer = false,
  isEdit,
  setIsEdit,
  isEditing,
  setIsEditing,
}) => {
  // Add keyboard event handler at component level
  // This dual-handler approach ensures that:
  //     Users can exit edit mode with Escape regardless of where focus is
  // The component responds appropriately in all focus scenarios
  // Edit mode can be exited even if focus moves to another element
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
      // Optional: Add tabIndex to make the div focusable
      tabIndex={isEdit ? 0 : -1}
    >
      {isEdit ? (
        <EditView
          content={content}
          setIsEdit={setIsEdit}
          messageIndex={messageIndex}
          isComposer={isComposer}
          isEditing={isEditing}
          setIsEditing={setIsEditing}
        />
      ) : (
        <ContentView content={content} />
      )}
    </div>
  );
};

// Keep the EditView component temporarily until we extract it
// This will be replaced in the next step
const EditView = /* existing implementation */

export default MessageContent;