// api/anthropic.ts
import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import type { MessageParam } from '@anthropic-ai/sdk/resources/messages';

// Add interfaces for type safety
interface ChatMessage {
  role: string;
  content: string;
}

interface ChatConfig {
  model: string;
  max_tokens: number;
  temperature: number;
  stream: boolean;
}

interface RequestData {
  messages: ChatMessage[];
  config: ChatConfig;
  apiKey: string;
}

export const runtime = 'edge';

// Helper function to safely check if an error is an instance of a specific class
const isErrorInstance = (error: unknown, ErrorClass: any): boolean => {
  return error instanceof Error &&
         error.constructor?.name === ErrorClass?.name;
};

// Helper function to safely create a TextEncoder
const getTextEncoder = () => {
  try {
    return new TextEncoder();
  } catch (e) {
    // Fallback for environments where TextEncoder isn't available
    return {
      encode: (str: string) => {
        const arr = new Uint8Array(str.length);
        for (let i = 0; i < str.length; i++) {
          arr[i] = str.charCodeAt(i);
        }
        return arr;
      }
    };
  }
};

export async function POST(req: NextRequest) {
  try {
    const data = await req.json() as RequestData;
    const { messages, config: chatConfig, apiKey } = data;

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "API key is required" }),
        { status: 401 }
      );
    }

    if (!messages?.length) {
      return new Response(
        JSON.stringify({ error: "Messages array is required" }),
        { status: 400 }
      );
    }

    if (!chatConfig.model) {
      return new Response(
        JSON.stringify({ error: "Model selection is required" }),
        { status: 400 }
      );
    }

    const anthropic = new Anthropic({ apiKey });
    const formattedMessages: MessageParam[] = messages.map((msg: ChatMessage) => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content,
    }));

    if (chatConfig.stream) {
      const stream = await anthropic.messages.stream({
        messages: formattedMessages,
        model: chatConfig.model,
        max_tokens: chatConfig.max_tokens,
        temperature: chatConfig.temperature,
      });

      const readableStream = stream.toReadableStream();
      
      return new Response(
        new ReadableStream({
          async start(controller) {
            let lastPing = Date.now();
            const keepAliveInterval = setInterval(() => {
              if (Date.now() - lastPing >= 5000) {
                controller.enqueue(new Uint8Array(Buffer.from(':keep-alive\n\n')));
                lastPing = Date.now();
              }
            }, 5000);

            try {
              for await (const chunk of readableStream) {
                lastPing = Date.now();
                if (chunk.type === 'content_block_delta' && chunk.delta?.type === 'text_delta') {
                  const payload = JSON.stringify({
                    type: 'content_block_delta',
                    delta: {
                      type: 'text_delta',
                      text: chunk.delta.text
                    }
                  });
                  controller.enqueue(new Uint8Array(Buffer.from(`data: ${payload}\n\n`)));
                } else if (chunk.type === 'message_stop') {
                  controller.enqueue(new Uint8Array(Buffer.from('data: [DONE]\n\n')));
                }
              }
              controller.close();
            } catch (error) {
              controller.error(error);
            } finally {
              clearInterval(keepAliveInterval);
            }
          }
        }),
        {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        }
      );
    } else {
      const response = await anthropic.messages.create({
        messages: formattedMessages,
        model: chatConfig.model,
        max_tokens: chatConfig.max_tokens,
        temperature: chatConfig.temperature,
      });

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }
  } catch (error) {
    console.error("❌ Chat API Error: ", error);
    console.error("Full error details:", {
      name: error instanceof Error ? error.name : "Unknown",
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });

    if (isErrorInstance(error, Anthropic.APIError)) {
      return new Response(
        JSON.stringify({
          error: "API Error",
          details: (error as Error).message,
          code: (error as any).status,
        }),
        { status: (error as any).status || 500 }
      );
    }

    if (isErrorInstance(error, Anthropic.AuthenticationError)) {
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
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}