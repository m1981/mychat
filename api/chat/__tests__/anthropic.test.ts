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
          content: [{
            type: 'text',
            text: 'Hello World'
          }],
          model: 'claude-2',
          stop_reason: 'end_turn',
          usage: {
            input_tokens: 10,
            output_tokens: 20
          }
        }),
        stream: vi.fn().mockImplementation(() => ({
          toReadableStream: () => {
            return new ReadableStream({
              start(controller) {
                const events = [
                  {
                    type: 'content_block_delta',
                    delta: { type: 'text_delta', text: 'Hello' }
                  },
                  {
                    type: 'content_block_delta',
                    delta: { type: 'text_delta', text: ' World' }
                  },
                  { type: 'message_stop' }
                ];

                for (const event of events) {
                  controller.enqueue(event);
                }
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

  it('should handle streaming response correctly', async () => {
    const req = new NextRequest('http://localhost', {
      method: 'POST',
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Hello' }],
        config: {
          model: 'claude-2',
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

    if (!response.body) {
      throw new Error('Response body is null');
    }

    // Test stream content
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let result = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      result += decoder.decode(value);
    }

    // Verify the SSE format
    expect(result).toContain('data: ');
    expect(result).toContain('Hello');
    expect(result).toContain('World');
    expect(result).toContain('[DONE]');
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
});