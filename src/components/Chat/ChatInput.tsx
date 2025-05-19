// Add to imports
import { useTitleGeneration } from '@hooks/useTitleGeneration';

// Inside the ChatInput component
function ChatInput() {
  // Existing code...
  const { generateTitle } = useTitleGeneration();
  const modelConfig = useStore(state => state.modelConfig);
  const currentChat = useStore(state => 
    state.chats[state.currentChatIndex] || { messages: [], titleSet: false }
  );
  
  // In your handleSubmit function
  const handleSubmit = async () => {
    // Existing submission code...
    
    // After successful submission, check if we need to generate a title
    if (!currentChat.titleSet && currentChat.messages.length >= 2) {
      await generateTitle(currentChat.messages, modelConfig);
    }
  };
  
  // Rest of component...
}