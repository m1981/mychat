import React, { useEffect, useRef } from 'react';
import ScrollToBottom from 'react-scroll-to-bottom';
import useStore from '@store/store';

import ScrollToBottomButton from './ScrollToBottomButton';
import ChatTitle from './ChatTitle';
import Message from './Message';
import NewMessageButton from './Message/NewMessageButton';
import CrossIcon from '@icon/CrossIcon';

import useSubmit from '@hooks/useSubmit';
import DownloadChat from './DownloadChat';
import CloneChat from './CloneChat';
import { Role } from '@type/chat';
import { providers } from '@type/providers';

interface Message {
  role: Role;
  content: string;
}

interface ErrorMessageProps {
  error: string;
  onClose: () => void;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({ error, onClose }) => (
  <div className='relative py-2 px-3 w-3/5 mt-3 max-md:w-11/12 border rounded-md border-red-500 bg-red-500/10'>
    <div className='text-gray-600 dark:text-gray-100 text-sm whitespace-pre-wrap'>
      {error}
    </div>
    <button
      className='text-white absolute top-1 right-1 cursor-pointer'
      onClick={onClose}
      aria-label="Close error message"
    >
      <CrossIcon />
    </button>
  </div>
);

const ChatContent = () => {
  // Store hooks
  const currentChat = useStore((state) =>
    state.chats?.[state.currentChatIndex]
  );
  const inputRole = useStore((state) => state.inputRole);
  const error = useStore((state) => state.error);
  const setError = useStore((state) => state.setError);
  const generating = useStore((state) => state.generating);
  const hideSideMenu = useStore((state) => state.hideSideMenu);
  const layoutWidth = useStore((state) => state.layoutWidth);

  // Get current provider
  const currentProvider = currentChat
    ? providers[currentChat.config.provider]
    : providers.openai;

  // Get messages
  const messages = useStore((state) =>
    state.chats &&
    state.chats.length > 0 &&
    state.currentChatIndex >= 0 &&
    state.currentChatIndex < state.chats.length
      ? state.chats[state.currentChatIndex].messages
      : []
  );

  // Get sticky index
  const stickyIndex = useStore((state) =>
    state.chats &&
    state.chats.length > 0 &&
    state.currentChatIndex >= 0 &&
    state.currentChatIndex < state.chats.length
      ? state.chats[state.currentChatIndex].messages.length
      : 0
  );

  // Refs
  const saveRef = useRef<HTMLDivElement>(null);

  // Custom hooks
  const { error: submitError } = useSubmit();

  // Layout width helper
  const getWidthClass = () => {
    if (layoutWidth === 'wide') {
      return hideSideMenu ? 'w-[85%]' : 'w-[65%]';
    }
    return hideSideMenu ? 'w-[75%]' : 'w-[55%]';
  };

  // Clear error when generating starts
  useEffect(() => {
    if (generating) {
      setError('');
    }
  }, [generating, setError]);

  return (
    <div className='flex-1 overflow-hidden'>
      <ScrollToBottom
        className='h-full dark:bg-gray-800'
        followButtonClassName='hidden'
      >
        <ScrollToBottomButton />
        <div className='flex flex-col items-center text-sm dark:bg-gray-800'>
          <div
            className='flex flex-col items-center text-sm dark:bg-gray-800 w-full'
            ref={saveRef}
          >
            <ChatTitle />

            {/* New Message Button when no messages */}
            {!generating && messages?.length === 0 && (
              <NewMessageButton messageIndex={-1} />
            )}

            {/* Message List */}
            {messages?.map((message: Message, index: number) => (
              <React.Fragment key={index}>
                <Message
                  role={message.role}
                  content={message.content}
                  messageIndex={index}
                />
                {!generating && <NewMessageButton messageIndex={index} />}
              </React.Fragment>
            ))}
          </div>

          {/* Sticky Message */}
          <Message
            role={inputRole}
            content=''
            messageIndex={stickyIndex}
            sticky
          />

          {/* Error Message */}
          {error && (
            <ErrorMessage
              error={error}
              onClose={() => setError('')}
            />
          )}

          {/* Download and Clone Buttons */}
          <div className={`mt-4 m-auto ${getWidthClass()}`}>
            {!generating && (
              <div className='md:w-[calc(100%-50px)] flex gap-4 flex-wrap justify-center'>
                <DownloadChat saveRef={saveRef} />
                <CloneChat />
              </div>
            )}
          </div>

          {/* Bottom Spacing */}
          <div className='w-full h-36' />
        </div>
      </ScrollToBottom>
    </div>
  );
};

export default ChatContent;
