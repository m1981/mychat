import React from 'react';

import StopGeneratingButton from '@components/StopGeneratingButton/StopGeneratingButton';
import useStore from '@store/store';

import MobileBar from '../MobileBar';

import ChatContent from './ChatContent';

const Chat = () => {
  const hideSideMenu = useStore((state) => state.hideSideMenu);

  return (
    <div
      className={`flex h-full flex-1 flex-col ${
        hideSideMenu ? 'md:pl-0' : 'md:pl-[260px]'
      }`}
    >
      <MobileBar />
      <main className='relative h-full w-full transition-width flex flex-col overflow-hidden items-stretch flex-1'>
        <ChatContent />
        <StopGeneratingButton />
      </main>
    </div>
  );
};

export default Chat;
