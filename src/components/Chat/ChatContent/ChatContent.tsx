import React, { useEffect, useRef, useState, useCallback } from 'react';

import CrossIcon from '@icon/CrossIcon2';
import useStore from '@store/store';
import { Role } from '@type/chat';

import ChatTitle from './ChatTitle';
import CloneChat from './CloneChat';
import DownloadChat from './DownloadChat';
import Message from './Message';
import NewMessageButton from './Message/NewMessageButton';
import ScrollToBottomButton from './ScrollToBottomButton';
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

const ChatContent: React.FC = () => {
  // Add temporary variable to disable NewMessageButton
  const in_future = true;

  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const saveRef = useRef<HTMLDivElement | null>(null);

  // State
  const [showScrollButton, setShowScrollButton] = useState(false);

  const inputRole = useStore((state) => state.inputRole);
  const error = useStore((state) => state.error);
  const setError = useStore((state) => state.setError);
  const generating = useStore((state) => state.generating);
  const hideSideMenu = useStore((state) => state.hideSideMenu);
  const layoutWidth = useStore((state) => state.layoutWidth);

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

  // Scroll handlers
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    const container = chatContainerRef.current;
    if (container instanceof HTMLDivElement) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior,
      });
    }
  }, []);

  const handleScroll = useCallback(() => {
    const container = chatContainerRef.current;
    if (container instanceof HTMLDivElement) {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShowScrollButton(!isNearBottom);
    }
  }, []);

  // Layout width helper
  const getWidthClass = () => {
    if (layoutWidth === 'wide') {
      return hideSideMenu ? 'w-[55%]' : 'w-[55%]';
    }
    return hideSideMenu ? 'w-[45%]' : 'w-[45%]';
  };

  // Effects
  useEffect(() => {
    if (generating) {
      setError('');
    }
  }, [generating, setError]);


  // Setup scroll listener
  useEffect(() => {
    const container = chatContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  return (
    <div className='flex-1 overflow-hidden'>
      <div
        ref={chatContainerRef}
        className="h-full overflow-y-auto dark:bg-gray-800 scroll-smooth"
      >
        <div className='flex flex-col items-center text-sm dark:bg-gray-800'>
          <div
            className='flex flex-col items-center text-sm dark:bg-gray-800 w-full'
            ref={saveRef}
          >
            <ChatTitle />

            {/* New Message Button when no messages */}
            {!generating && messages?.length === 0 && !in_future && (
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
                {!generating && !in_future && <NewMessageButton messageIndex={index} />}
              </React.Fragment>
            ))}

            {/* Composer Message */}
            <Message
              role={inputRole}
              content=''
              messageIndex={stickyIndex}
              isComposer
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
        </div>
      </div>

      <ScrollToBottomButton
        show={showScrollButton}
        onClick={() => scrollToBottom()}
      />
    </div>
  );
};

export default ChatContent;
