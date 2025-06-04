import { useCallback } from 'react';
import useStore from '@store/store';
import { DEFAULT_CHAT_CONFIG } from '@config/chat/ChatConfig';
import { v4 as uuidv4 } from 'uuid';

const useInitialiseNewChat = () => {
  // Get the addChat function directly from the store
  const addChat = useStore(state => state.addChat);

  const initialiseNewChat = useCallback(() => {
    // Create a new chat with default configuration
    const newChat = {
      id: uuidv4(),
      title: 'New Chat',
      messages: [],
      config: DEFAULT_CHAT_CONFIG
    };
    
    // Use the addChat function directly
    if (addChat) {
      addChat(newChat);
      // No need to set current chat index as addChat already does this
    } else {
      console.error('addChat function not found in store');
    }
  }, [addChat]);

  return initialiseNewChat;
};

export default useInitialiseNewChat;
