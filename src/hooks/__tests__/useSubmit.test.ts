import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { renderHook, act } from '@testing-library/react-hooks';
import { setupServer } from 'msw/node';
import { rest } from 'msw';
import useSubmit from '../useSubmit';
import useStore from '@store/store';

const server = setupServer();

describe('useSubmit Hook', () => {
  beforeAll(() => server.listen());
  afterAll(() => server.close());

  it('should handle SSE streaming correctly', async () => {
    // Mock SSE response
    server.use(
      rest.post('/api/chat/anthropic', (req, res, ctx) => {
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          start(controller) {
            const messages = [
              { type: 'content_block_delta', delta: { type: 'text_delta', text: 'Hello' } },
              { type: 'content_block_delta', delta: { type: 'text_delta', text: ' World' } },
              '[DONE]'
            ];

            messages.forEach(msg => {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(msg)}\n\n`));
            });
            controller.close();
          }
        });

        return new Response(stream, {
          headers: {
            'Content-Type': 'text/event-stream',
          },
        });
      })
    );

    // Initialize store with test data
    useStore.setState({
      chats: [{
        messages: [{ role: 'user', content: 'Hi' }],
        config: {
          provider: 'anthropic',
          modelConfig: {
            model: 'claude-2',
            temperature: 0.7,
            max_tokens: 1000
          }
        }
      }],
      currentChatIndex: 0,
      apiKeys: { anthropic: 'test-key' },
      generating: false
    });

    const { result } = renderHook(() => useSubmit());

    await act(async () => {
      await result.current.handleSubmit();
    });

    const finalState = useStore.getState();
    expect(finalState.chats[0].messages[1].content).toBe('Hello World');
    expect(finalState.generating).toBe(false);
  });

  it('should handle stream errors correctly', async () => {
    server.use(
      rest.post('/api/chat/anthropic', (req, res, ctx) => {
        return res(
          ctx.status(500),
          ctx.json({ error: 'Internal Server Error' })
        );
      })
    );

    const { result } = renderHook(() => useSubmit());

    await act(async () => {
      await result.current.handleSubmit();
    });

    const finalState = useStore.getState();
    expect(finalState.error).toBeTruthy();
    expect(finalState.generating).toBe(false);
  });

  it('should handle partial chunks correctly', async () => {
    server.use(
      rest.post('/api/chat/anthropic', (req, res, ctx) => {
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          start(controller) {
            // Simulate chunked response
            controller.enqueue(encoder.encode('data: {"type":"content_block_'));
            controller.enqueue(encoder.encode('delta","delta":{"type":"text_delta","text":"Hello"}}\n\n'));
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          }
        });

        return new Response(stream, {
          headers: {
            'Content-Type': 'text/event-stream',
          },
        });
      })
    );

    const { result } = renderHook(() => useSubmit());

    await act(async () => {
      await result.current.handleSubmit();
    });

    const finalState = useStore.getState();
    expect(finalState.chats[0].messages[1].content).toBe('Hello');
  });

  it('should handle keep-alive messages', async () => {
    server.use(
      rest.post('/api/chat/anthropic', (req, res, ctx) => {
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode(': keep-alive\n\n'));
            controller.enqueue(encoder.encode('data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Hello"}}\n\n'));
            controller.enqueue(encoder.encode(': keep-alive\n\n'));
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          }
        });

        return new Response(stream, {
          headers: {
            'Content-Type': 'text/event-stream',
          },
        });
      })
    );

    const { result } = renderHook(() => useSubmit());

    await act(async () => {
      await result.current.handleSubmit();
    });

    const finalState = useStore.getState();
    expect(finalState.chats[0].messages[1].content).toBe('Hello');
  });
});