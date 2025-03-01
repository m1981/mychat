import { parseEventSource } from '../helper';
import { parseSSEResponse } from '../api';

describe('SSE Parsing', () => {
  it('should parse basic Anthropic text deltas', () => {
    const input = [
      'event: completion\n',
      'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Hello"}}\n\n'
    ].join('');

    const result = parseEventSource(input);
    expect(result[0].data.delta.text).toBe('Hello');
  });

  it('should handle keep-alive messages', () => {
    const input = ':keep-alive\n\n';
    const result = parseEventSource(input);
    expect(result.length).toBe(0);
  });

  it('should parse multiple chunks correctly', () => {
    const input = [
      'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Hello"}}\n\n',
      'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":" World"}}\n\n',
      'data: [DONE]\n\n'
    ].join('');

    const chunks = parseSSEResponse(input);
    expect(chunks).toHaveLength(3);
    expect(chunks[0].delta.text).toBe('Hello');
    expect(chunks[1].delta.text).toBe(' World');
    expect(chunks[2].done).toBe(true);
  });

  it('should handle malformed JSON gracefully', () => {
    const input = 'data: {malformed_json}\n\n';
    expect(() => parseEventSource(input)).not.toThrow();
  });

  it('should handle multi-byte characters', () => {
    const input = [
      'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"известни"}}\n\n'
    ].join('');

    const result = parseEventSource(input);
    expect(result[0].data.delta.text).toBe('известни');
  });
});