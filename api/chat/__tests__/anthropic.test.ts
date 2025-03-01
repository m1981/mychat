import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../anthropic';
import Anthropic from '@anthropic-ai/sdk';

// Mock Anthropic SDK
vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: vi.fn(() => ({
      messages: {
        create: vi.fn().mockResolvedValue({
          id: 'msg_123',
          type: 'message',
          role: 'assistant',
          content: [{ type: 'text', text: 'Hello World' }],
          model: 'claude-2',
          stop_reason: 'end_turn',
          usage: { input_tokens: 10, output_tokens: 20 }
        }),
        stream: vi.fn().mockImplementation(() => ({
          toReadableStream: () => {
            const events = [
              '{"type":"content_block_delta","delta":{"type":"text_delta","text":"Hello"}}',
              '{"type":"content_block_delta","delta":{"type":"text_delta","text":" World"}}',
              '[DONE]'
            ];

            return new ReadableStream({
              start(controller) {
                events.forEach(event => {
                  controller.enqueue(`data: ${event}\n\n`);
                });
                controller.close();
              }
            });
          }
        }))
      }
    }))
  };
});

describe('Anthropic API Handler', () => {
  // Helper function to read SSE response
  async function readSSEResponse(response: Response): Promise<string[]> {
    const messages: string[] = [];
    let buffer = '';

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No reader available');

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += Buffer.from(value).toString();
      const lines = buffer.split('\n\n');

      // Process all complete messages
      buffer = lines.pop() || '';
      messages.push(...lines.filter(line => line.startsWith('data: ')));
    }

    // Process any remaining complete messages in the buffer
    if (buffer && buffer.startsWith('data: ')) {
      messages.push(buffer);
    }

    return messages;
  }

  it('should validate required fields', async () => {
    const req = new NextRequest('http://localhost', {
      method: 'POST',
      body: JSON.stringify({
        messages: [],
        config: {}
      })
    });

    const response = await POST(req);
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'API key is required' });
  });

  // it('should handle streaming response with proper SSE format', async () => {
  //   const req = new NextRequest('http://localhost', {
  //     method: 'POST',
  //     body: JSON.stringify({
  //       messages: [{ role: 'user', content: 'Hello' }],
  //       config: {
  //         model: 'claude-2',
  //         stream: true,
  //         max_tokens: 1000,
  //         temperature: 0.7
  //       },
  //       apiKey: 'test-key'
  //     })
  //   });
  //
  //   const response = await POST(req);
  //
  //   expect(response.headers.get('Content-Type')).toBe('text/event-stream');
  //
  //   const messages = await readSSEResponse(response);
  //
  //   expect(messages).toEqual([
  //     'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Hello"}}',
  //     'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":" World"}}',
  //     'data: [DONE]'
  //   ]);
  // });

  it('should handle non-streaming response', async () => {
    const req = new NextRequest('http://localhost', {
      method: 'POST',
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Hello' }],
        config: {
          model: 'claude-2',
          stream: false,
          max_tokens: 1000,
          temperature: 0.7
        },
        apiKey: 'test-key'
      })
    });

    const response = await POST(req);
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('application/json');

    const responseData = await response.json();
    expect(responseData).toMatchObject({
      id: expect.any(String),
      type: 'message',
      role: 'assistant',
      content: expect.arrayContaining([
        expect.objectContaining({
          type: 'text',
          text: expect.any(String)
        })
      ])
    });
  });
});