import { MessageInterface, ChatInterface, ModelConfig } from '@type/chat';
import { TitleGenerator } from './TitleGenerator';
import { AIProviderInterface } from '@type/provider';

export class TitleGenerationService {
  private titleGenerator: TitleGenerator;
  private updateCallback: (chats: ChatInterface[]) => void;
  
  constructor(
    provider: AIProviderInterface,
    updateCallback: (chats: ChatInterface[]) => void
  ) {
    this.titleGenerator = new TitleGenerator(provider);
    this.updateCallback = updateCallback;
  }
  
  async generateAndUpdateTitle(
    chatIndex: number,
    messages: MessageInterface[],
    chats: ChatInterface[],
    config: ModelConfig
  ): Promise<void> {
    try {
      // Only generate title if we have enough messages
      if (messages.length < 2) {
        return;
      }
      
      const title = await this.titleGenerator.generateChatTitle(messages, config);
      
      // Update chat title
      const updatedChats = [...chats];
      updatedChats[chatIndex] = {
        ...updatedChats[chatIndex],
        title,
        titleSet: true // Mark that we've set a title
      };
      
      this.updateCallback(updatedChats);
    } catch (error) {
      console.error('Failed to generate title:', error);
      // Don't update the title if there's an error
    }
  }
}