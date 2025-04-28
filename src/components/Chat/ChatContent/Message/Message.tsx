import React, { useState, useRef, useEffect } from 'react';

import useSubmit from '@hooks/useSubmit';
import useStore from '@store/store';
import { ChatInterface } from '@type/chat';
import { Role } from '@type/chat';

import Avatar from './Avatar';
import MessageActionButtons from './MessageActionButtons';
import MessageContent from './MessageContent';
import RoleSelector from './RoleSelector';
import { SelectionCopyProvider } from '../SelectionCopyProvider';

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

    const handleRefresh = () => {
      const updatedChats: ChatInterface[] = JSON.parse(
        JSON.stringify(useStore.getState().chats)
      );
      const updatedMessages = updatedChats[currentChatIndex].messages;
      updatedMessages.splice(updatedMessages.length - 1, 1);
      setChats(updatedChats);
      handleSubmit();
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

    return (
      <div
        ref={messageRef}
        className={`w-full border-b border-black/10 dark:border-gray-900/50 text-gray-800 dark:text-gray-100 group ${
          backgroundStyle[messageIndex % 2]
        }`}
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
      </div>
    );
  }
);

export default Message;
