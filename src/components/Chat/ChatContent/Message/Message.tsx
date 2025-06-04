import React, { useState, useRef, useEffect } from 'react';

import { useSubmit } from '@hooks/useSubmit';
import useStore from '@store/store';
import { ChatInterface } from '@type/chat';
import { Role } from '@type/chat';

import { SelectionCopyProvider } from '../SelectionCopyProvider';

import Avatar from './Avatar';
import JumpToEditButton from './JumpToEditButton';
import MessageActionButtons from './MessageActionButtons';
import MessageContent from './MessageContent';
import RoleSelector from './RoleSelector';

const backgroundStyle = ['dark:bg-gray-800', 'bg-gray-50 dark:bg-gray-650'];

const Message = React.memo(
  ({
    role,
    content,
    messageIndex,
    isComposer = false,  // renamed from sticky
  }: {
    role: Role;
    content: string;
    messageIndex: number;
    isComposer?: boolean;  // renamed from sticky
  }) => {
    const { handleSubmit } = useSubmit();
    const [isDelete, setIsDelete] = useState<boolean>(false);
    const [isEdit, setIsEdit] = useState<boolean>(isComposer);  // updated
    const [isEditing, setIsEditing] = useState<boolean>(false);
    const hideSideMenu = useStore((state) => state.hideSideMenu);
    const layoutWidth = useStore((state) => state.layoutWidth);
    const currentChatIndex = useStore((state) => state.currentChatIndex);
    const setChats = useStore((state) => state.setChats);
    const messageRef = useRef<HTMLDivElement | null>(null);
    const [showBottomActions, setShowBottomActions] = useState(false);
    // Add a ref to track if refresh is in progress
    const refreshInProgressRef = useRef(false);

    const handleDelete = () => {
      const updatedChats: ChatInterface[] = JSON.parse(
        JSON.stringify(useStore.getState().chats)
      );
      updatedChats[currentChatIndex].messages.splice(messageIndex, 1);
      setChats(updatedChats);
    };

    const handleEdit = () => {
      setIsEdit(true);
      setIsEditing(true);
    };
    
    const handleMove = (direction: 'up' | 'down') => {
      const updatedChats: ChatInterface[] = JSON.parse(
        JSON.stringify(useStore.getState().chats)
      );
      const updatedMessages = updatedChats[currentChatIndex].messages;
      const temp = updatedMessages[messageIndex];
      if (direction === 'up') {
        updatedMessages[messageIndex] = updatedMessages[messageIndex - 1];
        updatedMessages[messageIndex - 1] = temp;
      } else {
        updatedMessages[messageIndex] = updatedMessages[messageIndex + 1];
        updatedMessages[messageIndex + 1] = temp;
      }
      setChats(updatedChats);
    };

    const handleRefresh = async () => {
      console.log('🔄 handleRefresh called');
      
      // Prevent multiple refreshes
      if (refreshInProgressRef.current || useStore.getState().generating) {
        console.log('⚠️ Refresh already in progress or generating, ignoring');
        return;
      }
      
      refreshInProgressRef.current = true;
      
      try {
        // Get current state to avoid race conditions
        const currentState = useStore.getState();
        const updatedChats: ChatInterface[] = JSON.parse(
          JSON.stringify(currentState.chats)
        );
        
        // Remove the last assistant message
        const updatedMessages = updatedChats[currentChatIndex].messages;
        if (updatedMessages[updatedMessages.length - 1]?.role === 'assistant') {
          updatedMessages.pop();
        }
        
        // Update state and wait for it to complete
        await new Promise<void>(resolve => {
          console.log('📝 Updating chats before refresh');
          setChats(updatedChats);
          // Use a timeout to ensure state is updated
          setTimeout(resolve, 100);
        });
        
        console.log('📤 Calling handleSubmit from refresh');
        // Now submit with updated state
        handleSubmit();
      } catch (error) {
        console.error('❌ Error during refresh:', error);
      } finally {
        // Reset the flag after a delay to prevent rapid re-clicks
        setTimeout(() => {
          refreshInProgressRef.current = false;
        }, 500);
      }
    };

    const handleCopy = () => {
      navigator.clipboard.writeText(content);
    };

    const getWidthClass = () => {
      if (layoutWidth === 'wide') {
        return hideSideMenu ? 'w-[55%]' : 'w-[55%]';
      }
      return hideSideMenu ? 'w-[40%]' : 'w-[40%]';
    };

    useEffect(() => {
      const checkHeight = () => {
        if (messageRef.current) {
          const height = messageRef.current.offsetHeight;
          setShowBottomActions(height > 600);
        }
      };

      checkHeight();
      // Add resize observer to handle dynamic content changes
      const resizeObserver = new ResizeObserver(checkHeight);
      if (messageRef.current) {
        resizeObserver.observe(messageRef.current);
      }

      return () => resizeObserver.disconnect();
    }, [content]); // Re-run when content changes

    // Add a unique ID for this message when in edit mode
    const editAreaId = `edit-area-${messageIndex}`;

    return (
      <div
        ref={messageRef}
        className={`w-full border-b border-black/10 dark:border-gray-900/50 text-gray-800 dark:text-gray-100 group ${
          backgroundStyle[messageIndex % 2]
        }`}
        role={role} // Ensure role is set here
        data-role={role} // Add a data attribute as a backup
        data-testid={`message-${role}`} // Add a test ID for easier selection
        data-message-index={messageIndex}
      >
        <div
          className={`text-base gap-4 md:gap-6 m-auto p-4 md:py-6 flex transition-all ease-in-out 
              max-w-[1400px] min-w-[300px] ${getWidthClass()}`}
        >
          <div className="flex-shrink-0 w-[30px]">
            <div className="sticky top-0">
              <Avatar role={role} />
            </div>
          </div>
          <div className="flex-1 overflow-hidden">
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <RoleSelector
                  role={role}
                  messageIndex={messageIndex}
                  isComposer={isComposer}
                />
                {!isEdit && !isComposer && (
                  <MessageActionButtons
                    isDelete={isDelete}
                    role={role}
                    messageIndex={messageIndex}
                    setIsEdit={handleEdit}
                    setIsDelete={setIsDelete}
                    handleRefresh={handleRefresh}
                    handleMoveUp={() => handleMove('up')}
                    handleMoveDown={() => handleMove('down')}
                    handleDelete={handleDelete}
                    handleCopy={handleCopy}
                  />
                )}
              </div>
              <div id={isEdit && !isComposer ? editAreaId : undefined}>
                <SelectionCopyProvider>
                  <MessageContent
                    role={role}
                    content={content}
                    messageIndex={messageIndex}
                    isComposer={isComposer}
                    isEdit={isEdit}
                    setIsEdit={setIsEdit}
                    isEditing={isEditing}
                    setIsEditing={setIsEditing}
                  />
                </SelectionCopyProvider>
              </div>
              {!isEdit && !isComposer && showBottomActions && (
                <div className="mt-4 flex justify-end">
                  <MessageActionButtons
                    isDelete={isDelete}
                    role={role}
                    messageIndex={messageIndex}
                    setIsEdit={handleEdit}
                    setIsDelete={setIsDelete}
                    handleRefresh={handleRefresh}
                    handleMoveUp={() => handleMove('up')}
                    handleMoveDown={() => handleMove('down')}
                    handleDelete={handleDelete}
                    handleCopy={handleCopy}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
        <JumpToEditButton 
          editAreaId={editAreaId} 
          visible={isEdit && !isComposer} 
        />
      </div>
    );
  }
);

export default Message;
