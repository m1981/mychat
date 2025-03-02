import { generateDefaultChat } from '@constants/chat';
import useStore from '@store/store';
import { ChatInterface } from '@type/chat';

const useAddChat = () => {
  const setChats = useStore((state) => state.setChats);
  const setCurrentChatIndex = useStore((state) => state.setCurrentChatIndex);

  return (folder?: string) => {
    const chats = useStore.getState().chats;
    const defaultSystemMessage = useStore.getState().defaultSystemMessage;
    
    if (chats) {
      const updatedChats: ChatInterface[] = JSON.parse(JSON.stringify(chats));
      let titleIndex = 1;
      let title = `New Chat ${titleIndex}`;

      while (chats.some((chat: ChatInterface) => chat.title === title)) {
        titleIndex += 1;
        title = `New Chat ${titleIndex}`;
      }

      updatedChats.unshift(generateDefaultChat(title, folder, defaultSystemMessage));
      setChats(updatedChats);
      setCurrentChatIndex(0);
    }
  };
};

export default useAddChat;
