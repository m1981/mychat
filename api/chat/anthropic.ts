// api/chat/anthropic.ts
import type { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

interface ChatConfig {
  stream?: boolean;
  model?: string;
  max_tokens?: number;
  temperature?: number;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string | Array<{ type: string; text?: string; }>;
}

interface RequestBody {
  messages: ChatMessage[];
  config: ChatConfig;
  model?: string;
}

interface StreamErrorEvent {
  type: 'error';
  error: {
    type: string;
    message: string;
    status?: number;
  };
}

export const runtime = 'edge';

  const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

function createStreamResponse(stream: ReadableStream) {
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const { messages, config: chatConfig, model } = await req.json() as RequestBody;

    console.log("🔍 Initial Request Data:", {
      hasMessages: !!messages,
      messageCount: messages?.length,
      model: model || chatConfig?.model,
    });

    // Input validation
    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: "Messages array is required" }),
        { status: 400 }
      );
    }

    // Convert messages to Anthropic format
    const anthropicMessages = messages.map((msg: any) => ({
      role: msg.role,
      content: msg.content,
    }));

    console.log("🚀 Anthropic API Request:", {
      model: model || chatConfig?.model || 'claude-3-opus-20240229',
      messageCount: anthropicMessages.length,
      stream: chatConfig?.stream,
    });

    if (chatConfig?.stream) {
      const stream = await anthropic.messages.stream({
        messages: anthropicMessages,
        model: model || chatConfig.model || 'claude-3-opus-20240229',
        max_tokens: chatConfig.max_tokens || 4096,
        temperature: chatConfig.temperature || 0.7,
        stream: true,
      });

      // Create a TransformStream to handle the streaming response
      const { readable, writable } = new TransformStream();
      const writer = writable.getWriter();
      const encoder = new TextEncoder();

      // Handle the stream
      (async () => {
      try {
          let lastPing = Date.now();
          const PING_INTERVAL = 5000;

          const sendPing = async () => {
            if (Date.now() - lastPing >= PING_INTERVAL) {
              await writer.write(encoder.encode('event: ping\ndata: {}\n\n'));
              lastPing = Date.now();
            }
          };

        for await (const event of stream) {
            // Send keep-alive ping
            await sendPing();

            // Write the event
            await writer.write(
              encoder.encode(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`)
            );

            lastPing = Date.now();
      }
        } catch (error) {
          console.error("Stream error:", error);
          const errorEvent: StreamErrorEvent = {
      type: 'error',
      error: {
              type: 'stream_error',
        message: error instanceof Error ? error.message : 'Unknown streaming error'
          }
          };
          await writer.write(
            encoder.encode(`event: error\ndata: ${JSON.stringify(errorEvent)}\n\n`)
          );
      } finally {
          await writer.write(encoder.encode('data: [DONE]\n\n'));
          await writer.close();
      }
      })();

      return createStreamResponse(readable);
    } else {
      const response = await anthropic.messages.create({
        messages: anthropicMessages,
        model: model || chatConfig?.model || 'claude-3-opus-20240229',
        max_tokens: chatConfig?.max_tokens || 4096,
        temperature: chatConfig?.temperature || 0.7,
      });

      console.log("✅ Anthropic API Response received:", {
        status: "success",
        stopReason: response.stop_reason,
        contentTypes: response.content.map((c) => c.type),
      });

      return new Response(JSON.stringify(response), {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
        },
      });
    }
  } catch (error) {
    console.error("❌ Anthropic API Error: ", error);
    console.error("Full error details:", {
      name: error instanceof Error ? error.name : "Unknown",
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });

    if (error instanceof Anthropic.APIError) {
      return new Response(
        JSON.stringify({
          error: "API Error",
          details: error.message,
          code: error.status,
        }),
        { status: error.status }
      );
      }

    if (error instanceof Anthropic.AuthenticationError) {
      return new Response(
        JSON.stringify({
          error: "Authentication Error",
          details: "Invalid API key or authentication failed",
        }),
        { status: 401 }
      );
    }

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "An unknown error occurred",
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
