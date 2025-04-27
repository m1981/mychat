import React from 'react';

import StopGeneratingButton from '@components/StopGeneratingButton/StopGeneratingButton';
import useStore from '@store/store';

import MobileBar from '../MobileBar';

import ChatContent from './ChatContent';

const Chat = () => {
  const hideSideMenu = useStore((state) => state.hideSideMenu);

  return (
    <div className="relative flex h-full flex-1">
      {/* Fixed width sidebar space */}
      <div className={`fixed left-0 w-[260px] transition-transform duration-200 ${
        hideSideMenu ? '-translate-x-[260px]' : 'translate-x-0'
      }`}>
        {/* Your sidebar content */}
      </div>
      
      {/* Main content */}
      <div className="flex h-full flex-1 flex-col">
        <MobileBar />
        <main className="relative h-full w-full transition-width flex flex-col overflow-hidden items-stretch flex-1">
          <ChatContent />
          <StopGeneratingButton />
        </main>
      </div>
    </div>
  );
};

export default Chat;
