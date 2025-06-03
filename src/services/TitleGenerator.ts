/* eslint-env browser */

import { MessageInterface, ModelConfig } from '@type/chat';

type TitleGeneratorResponse = {
  content?: string;
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

/**
 * @deprecated This class is being replaced by the TitleGenerator in useTitleGeneration hook.
 * It will be removed once the migration to hooks is complete.
 */
export class TitleGenerator {
  constructor(
    private readonly generateTitle: (
      messages: MessageInterface[],
      config: ModelConfig
    ) => Promise<TitleGeneratorResponse | string>,
    private readonly language: string,
    private readonly defaultConfig: ModelConfig
  ) {
    if (!defaultConfig || !defaultConfig.model) {
      throw new Error('Invalid model configuration');
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

  async generateChatTitle(
    userMessage: string,
    assistantMessage: string
  ): Promise<string> {
    if (!this.defaultConfig || !this.defaultConfig.model) {
      throw new Error('Invalid model configuration');
    }

    const message: MessageInterface = {
      role: 'user',
      content: `Generate a title in less than 6 words for the following message (language: ${this.language}):\n"""\nUser: ${userMessage}\nAssistant: ${assistantMessage}\n"""`,
    };

    try {
      const response = await this.generateTitle([message], this.defaultConfig);
      console.log('Title generation raw response:', response);

      let title: string;

      // Handle different response types
      if (typeof response === 'string') {
        title = response;
      }
      // Handle structured response
      else if ('content' in response && response.content) {
        title = response.content;
      }
      // Handle OpenAI-style response
      else if ('choices' in response && Array.isArray(response.choices)) {
        const content = response.choices[0]?.message?.content;
        if (!content) {
          throw new Error('Invalid response format from title generation');
        }
        title = content;
      }
      else {
        throw new Error('Invalid response format from title generation');
      }

      return this.cleanupTitle(title);
    } catch (error) {
      console.error('Title generation failed:', error);
      return "New Chat"; // Return default title instead of throwing
    }
  }
}