import { MessageInterface, ChatInterface } from '@type/chat';
import { TitleGenerator } from './TitleGenerator';
import useStore from '@store/store';

export class TitleGenerationService {
  constructor(
    private titleGenerator: TitleGenerator,
    private setChats: (chats: ChatInterface[]) => void
  ) {}

  async generateAndUpdateTitle(
    messages: MessageInterface[],
    chatIndex: number
  ): Promise<void> {
    const lastUserMessage = messages
      .slice()
      .reverse()
      .find(msg => msg.role === 'user')?.content || '';
    
    const lastAssistantMessage = messages
      .slice()
      .reverse()
      .find(msg => msg.role === 'assistant')?.content || '';

    const title = await this.titleGenerator.generateChatTitle(
      lastUserMessage,
      lastAssistantMessage
    );

    const state = useStore.getState();
    if (!state.chats) {
      throw new Error('Chats array is undefined');
    }

    const updatedChats = [...(state.chats || [])];
    updatedChats[chatIndex] = {
      ...updatedChats[chatIndex],
      title,
      titleSet: true
    };
    this.setChats(updatedChats);
  }
}