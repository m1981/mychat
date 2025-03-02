import React from 'react';
import PlusIcon from '@icon/PlusIcon';
import useStore from '@store/store';
import { ChatInterface } from '@type/chat';
import useAddChat from '@hooks/useAddChat';

const NewMessageButton = React.memo(
  ({ messageIndex }: { messageIndex: number }) => {
    const setChats = useStore((state) => state.setChats);
    const currentChatIndex = useStore((state) => state.currentChatIndex);
    const createNewChat = useAddChat();  // renamed to avoid confusion

    const addMessage = () => {
      if (currentChatIndex === -1) {
        createNewChat();
      } else {
        const updatedChats: ChatInterface[] = JSON.parse(
          JSON.stringify(useStore.getState().chats)
        );
        updatedChats[currentChatIndex].messages.splice(messageIndex + 1, 0, {
          content: '',
          role: 'user',
        });
        setChats(updatedChats);
      }
    };

    return (
      <div className='h-0 w-0 relative' key={messageIndex}>
        <div
          className='absolute top-0 right-0 translate-x-1/2 translate-y-[-50%] text-gray-600 dark:text-white cursor-pointer bg-gray-200 dark:bg-gray-600/80 rounded-full p-1 text-sm hover:bg-gray-300 dark:hover:bg-gray-800/80 transition-bg duration-200'
          onClick={addMessage}
        >
          <PlusIcon />
        </div>
      </div>
    );
  }
);

export default NewMessageButton;
