import { MessageInterface, ModelConfig } from '@type/chat';

type TitleGeneratorResponse = {
  content?: string;
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

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

      // Handle different response types
      if (typeof response === 'string') {
        return response.trim();
      }

      // Handle structured response
      if ('content' in response && response.content) {
        return response.content.trim();
      }

      // Handle OpenAI-style response
      if ('choices' in response && Array.isArray(response.choices)) {
        const content = response.choices[0]?.message?.content;
        if (content) {
          return content.trim();
        }
      }

      throw new Error('Invalid response format from title generation');
    } catch (error) {
      console.error('Title generation failed:', error);
      throw error;
    }
  }
}