import React from 'react';
import useStore from '@store/store';

import Avatar from './Avatar';
import MessageContent from './MessageContent';

import { Role } from '@type/chat';
import RoleSelector from './RoleSelector';

const backgroundStyle = ['dark:bg-gray-800', 'bg-gray-50 dark:bg-gray-650'];

const Message = React.memo(
  ({
    role,
    content,
    messageIndex,
    sticky = false,
  }: {
    role: Role;
    content: string;
    messageIndex: number;
    sticky?: boolean;
  }) => {
    const hideSideMenu = useStore((state) => state.hideSideMenu);
    const layoutWidth = useStore((state) => state.layoutWidth);

    const getWidthClass = () => {
      if (layoutWidth === 'wide') {
        return hideSideMenu ? 'w-[85%]' : 'w-[65%]';
      }
      return hideSideMenu ? 'w-[75%]' : 'w-[55%]';
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
          <div className='w-[calc(100%-50px)] '>
            <RoleSelector
              role={role}
              messageIndex={messageIndex}
              sticky={sticky}
            />
            <MessageContent
              role={role}
              content={content}
              messageIndex={messageIndex}
              sticky={sticky}
            />
          </div>
        </div>
      </div>
    );
  }
);

export default Message;
