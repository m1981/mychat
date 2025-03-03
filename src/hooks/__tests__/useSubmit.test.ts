import { describe, it, expect, vi } from 'vitest';
import { TitleGenerator } from '../useSubmit';
import { DEFAULT_MODEL_CONFIG } from '@config/chat/ModelConfig';

describe('TitleGenerator', () => {
  it('should generate title with correct message format and config', async () => {
    const generateTitle = vi.fn().mockResolvedValue('Generated Title');
    const generator = new TitleGenerator(generateTitle, 'en', DEFAULT_MODEL_CONFIG);

    await generator.generateChatTitle('Hello', 'Hi there');

    expect(generateTitle).toHaveBeenCalledWith(
      [
        {
          role: 'user',
          content: 'Generate a title in less than 6 words for the following message (language: en):\n"""\nUser: Hello\nAssistant: Hi there\n"""'
        }
      ],
      DEFAULT_MODEL_CONFIG
    );
  });
});