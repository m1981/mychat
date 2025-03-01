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

export async function POST(req: NextRequest) {
  try {
    const data = await req.json() as RequestData;
    const { messages, config: chatConfig, apiKey } = data;

    if (!apiKey) {
      console.error("No API key provided");
      return new Response(
        JSON.stringify({ error: "API key is required" }),
        { status: 401 }
      );
    }

    if (!messages || !Array.isArray(messages)) {
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

    const anthropic = new Anthropic({
      apiKey: apiKey,
    });

    // Format messages for Anthropic API
    const formattedMessages: MessageParam[] = messages.map((msg: ChatMessage) => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content,
    }));

    console.log("🔍 Initial Request Data:", {
      hasMessages: !!messages,
      messageCount: messages?.length,
      model: chatConfig.model,
    });

    if (chatConfig.stream) {
      console.log("🚀 Anthropic API Stream Request:", {
        model: chatConfig.model,
        messageCount: formattedMessages.length,
        stream: chatConfig.stream,
      });

      const stream = await anthropic.messages.stream({
        messages: formattedMessages,
        model: chatConfig.model,
        max_tokens: chatConfig.max_tokens,
        temperature: chatConfig.temperature,
      });

      if (!stream) {
        console.error("Stream creation failed");
        return new Response(
          JSON.stringify({ error: "Failed to create stream" }),
          { status: 500 }
        );
      }

      const encoder = new TextEncoder();
      const transformStream = new TransformStream({
        async transform(chunk, controller) {
          // Add debug logging here
          console.log('Raw chunk from Anthropic:', chunk);
          
          if (chunk.type === 'content_block_delta' && chunk.delta?.type === 'text_delta') {
            const payload = JSON.stringify({
              type: 'content_block_delta',
              delta: {
                type: 'text_delta',
                text: chunk.delta.text
              }
            });
            controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
          } else if (chunk.type === 'message_stop') {
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          }
        },
        flush(controller) {
          // Remove this as it sends an extra DONE signal
          // controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        }
      });

      // Convert MessageStream to ReadableStream before piping
      const readableStream = stream.toReadableStream();
      const response = new Response(readableStream.pipeThrough(transformStream), {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });

      // Add debug header to track stream initialization
      response.headers.set('X-Stream-Debug', 'initialized');
      return response;
    } else {
      console.log("🚀 Anthropic API Regular Request:", {
        model: chatConfig.model,
        messageCount: formattedMessages.length,
      });

      const response = await anthropic.messages.create({
        messages: formattedMessages,
        model: chatConfig.model,
        max_tokens: chatConfig.max_tokens,
        temperature: chatConfig.temperature,
      });

      return new Response(JSON.stringify(response), {
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error("❌ Chat API Error: ", error);
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
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}