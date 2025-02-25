import React, { useState, useEffect } from 'react';
import useStore from '@store/store';
import useSubmit from '@hooks/useSubmit';
import { ChatInterface } from '@type/chat';
import Avatar from './Avatar';
import MessageContent from './MessageContent';
import { Role } from '@type/chat';
import RoleSelector from './RoleSelector';
import MessageActionButtons from './MessageActionButtons';

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
        return hideSideMenu ? 'w-[85%]' : 'w-[85%]';
      }
      return hideSideMenu ? 'w-[75%]' : 'w-[75%]';
    };

    return (
      <div
        className={`w-full border-b border-black/10 dark:border-gray-900/50 text-gray-800 dark:text-gray-100 group ${
          backgroundStyle[messageIndex % 2]
        }`}
      >
        <div
          className={`text-base gap-4 md:gap-6 m-auto p-4 md:py-6 flex transition-all ease-in-out ${getWidthClass()}`}
        >
          <Avatar role={role} />
          <div className='w-[calc(100%-50px)]'>
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
          </div>
        </div>
      </div>
    );
  }
);

export default Message;
