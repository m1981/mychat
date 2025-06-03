import useStore from '@store/store';
import { MessageInterface, ChatInterface } from '@type/chat';

import { TitleGenerator } from './TitleGenerator';

/**
 * @deprecated This class is being replaced by the useTitleGeneration hook.
 * It will be removed once the migration to hooks is complete.
 */
export class TitleGenerationService {
  constructor(
    private titleGenerator: TitleGenerator,
    private setChats: (chats: ChatInterface[]) => void
  ) {}

  async generateAndUpdateTitle(
    messages: MessageInterface[],
    chatIndex: number
  ): Promise<void> {
    try {
      const title = await this.titleGenerator.generateChatTitle(
        // Extract last user and assistant messages
        messages.slice().reverse().find(msg => msg.role === 'user')?.content || '',
        messages.slice().reverse().find(msg => msg.role === 'assistant')?.content || ''
      );

      const state = useStore.getState();
      if (!state.chats || !Array.isArray(state.chats)) {
        console.error('Invalid chats state:', state.chats);
        return; // Prevent updating with invalid state
      }

      // Create a safe copy of the chats array
      const updatedChats = [...state.chats];
      
      // Ensure the chat at the index exists
      if (!updatedChats[chatIndex]) {
        console.error(`Chat at index ${chatIndex} does not exist`);
        return;
      }
      
      // Update the title
      updatedChats[chatIndex] = {
        ...updatedChats[chatIndex],
        title,
        titleSet: true
      };
      
      this.setChats(updatedChats);
    } catch (error) {
      console.error('Failed to generate title:', error);
      // Don't update state on error
    }
  }
}