import { describe, it, expect } from 'vitest';
import { getChatGPTEncoding } from '../messageUtils';

describe('Message Utils', () => {
  it('should correctly encode messages', () => {
    const messages = [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi there' }
    ];
    
    const encoded = getChatGPTEncoding(messages, 'gpt-4');
    expect(encoded).toBeDefined();
  });
});