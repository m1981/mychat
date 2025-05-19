/* eslint-env browser */

import { TitleGeneratorInterface } from './interfaces/TitleGeneratorInterface';
import { MessageInterface, ModelConfig } from '@type/chat';
import { AIProviderInterface } from '@type/provider';

export class TitleGenerator implements TitleGeneratorInterface {
  private provider: AIProviderInterface;
  
  constructor(provider: AIProviderInterface) {
    this.provider = provider;
  }
  
  async generateChatTitle(messages: MessageInterface[], config: ModelConfig): Promise<string> {
    try {
      const prompt = this.formatTitlePrompt(messages);
      const formattedRequest = this.provider.formatRequest(
        { ...config, stream: false }, // Ensure streaming is disabled for title generation
        prompt
      );
      const response = await this.provider.submitCompletion(formattedRequest);
      return this.extractTitleFromResponse(response);
    } catch (error) {
      console.error('Error generating chat title:', error);
      return 'New Conversation'; // Fallback title
    }
  }
  
  private formatTitlePrompt(messages: MessageInterface[]): MessageInterface[] {
    // Find the last user and assistant messages for context
    const lastUserMessage = messages
      .slice()
      .reverse()
      .find(msg => msg.role === 'user')?.content || '';
    
    const lastAssistantMessage = messages
      .slice()
      .reverse()
      .find(msg => msg.role === 'assistant')?.content || '';
    
    // Create a system message for better title generation
    const systemMessage: MessageInterface = {
      role: 'system',
      content: 'Generate a concise, descriptive title (5 words or less) for this conversation. Return only the title text with no quotes or additional explanation.'
    };
    
    // Create a prompt for title generation
    return [
      systemMessage,
      {
        role: 'user',
        content: `Generate a title for this conversation:\nUser: ${lastUserMessage}\nAssistant: ${lastAssistantMessage}`
      }
    ];
  }
  
  private extractTitleFromResponse(response: any): string {
    let title = '';
    
    try {
      // Handle different response formats from various providers
      if (typeof response.content === 'string') {
        title = response.content;
      } else if (response.choices && Array.isArray(response.choices)) {
        // OpenAI format
        title = response.choices[0]?.message?.content || 
               response.choices[0]?.delta?.content || '';
      } else if (response.delta && typeof response.delta.text === 'string') {
        // Anthropic format
        title = response.delta.text;
      }
      
      return this.cleanupTitle(title);
    } catch (error) {
      console.error('Error extracting title from response:', error);
      return 'New Conversation';
    }
  }
  
  private cleanupTitle(title: string): string {
    return title
      .trim()
      // Remove quotes at start and end
      .replace(/^["'`]|["'`]$/g, '')
      // Remove any remaining quotes
      .replace(/["'`]/g, '')
      // Remove any special characters at the start or end
      .replace(/^[^\w\s]|[^\w\s]$/g, '')
      // Remove multiple spaces
      .replace(/\s+/g, ' ')
      .trim();
  }
}
