import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../anthropic';
import Anthropic from '@anthropic-ai/sdk';
import { PassThrough } from 'stream';
import { Response } from 'node-fetch';
import { TextEncoder , TextDecoder } from 'node:util'
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
            return new ReadableStream({
              async start(controller) {
                const encoder = new TextEncoder();
                controller.enqueue(encoder.encode('data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Hello"}}\n\n'));
                controller.enqueue(encoder.encode('data: {"type":"content_block_delta","delta":{"type":"text_delta","text":" World"}}\n\n'));
                controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                controller.close();
              }
            });
          }
        }))
      }
    }))
  };
});

async function iteratorToStream(iterator: AsyncGenerator<any>): Promise<PassThrough> {
  const parts: unknown[] = [];

  for await (const chunk of iterator) {
    parts.push(chunk);
  }

  let index = 0;
  const stream = new PassThrough({
    read() {
      const value = parts[index];
      if (value === undefined) {
        stream.end();
      } else {
        index += 1;
        stream.write(value);
      }
    },
  });

  return stream;
}

describe('Anthropic API Handler', () => {
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

  it('should handle streaming response', async () => {
    const req = new NextRequest('http://localhost', {
      method: 'POST',
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Hello' }],
        config: {
          model: 'claude-3-sonnet',
          stream: true,
          max_tokens: 1000,
          temperature: 0.7
        },
        apiKey: 'test-key'
      })
    });

    const response = await POST(req);

    // Verify headers
    expect(response.headers.get('Content-Type')).toBe('text/event-stream');
    expect(response.headers.get('Cache-Control')).toBe('no-cache');
    expect(response.headers.get('Connection')).toBe('keep-alive');

    const decoder = new TextDecoder();
    let text = '';

    // Read the stream and concatenate chunks
    for await (const chunk of response.body) {
      // Ensure chunk is Uint8Array
      if (chunk instanceof Uint8Array) {
        text += decoder.decode(chunk, { stream: true });
    }
    }
    // Final decode to handle any remaining bytes
    text += decoder.decode(undefined, { stream: false });

    const messages = text
      .split('\n\n')
      .filter(line => line.trim())
      .filter(line => line.startsWith('data: '));

    expect(messages).toEqual([
      'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Hello"}}',
      'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":" World"}}',
      'data: [DONE]'
    ]);

    // Verify message content
    const parsedMessages = messages
      .filter(msg => !msg.includes('[DONE]'))
      .map(msg => JSON.parse(msg.replace('data: ', '')));

    parsedMessages.forEach(msg => {
      expect(msg).toMatchObject({
        type: 'content_block_delta',
        delta: {
          type: 'text_delta',
          text: expect.any(String)
        }
      });
    });
  });

  it('should handle streaming errors', async () => {
    // Override the mock for this specific test
    vi.mocked(Anthropic).mockImplementation(() => ({
      messages: {
        stream: vi.fn().mockImplementation(() => {
          throw new Error('Stream error');
        })
      }
    }));

    const req = new NextRequest('http://localhost', {
      method: 'POST',
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Hello' }],
        config: {
          model: 'claude-3-sonnet',
          stream: true,
          max_tokens: 1000,
          temperature: 0.7
        },
        apiKey: 'test-key'
      })
    });

    const response = await POST(req);
    expect(response.status).toBe(500);
    const errorData = await response.json();
    expect(errorData).toHaveProperty('error');
  });
});