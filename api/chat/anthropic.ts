// api/anthropic.ts
/* eslint-env node */
import Anthropic from '@anthropic-ai/sdk';
import type {
  ContentBlockStopEvent,
  MessageStopEvent
} from '@anthropic-ai/sdk';
import type { MessageInterface } from '@type/chat';
import type { NextApiRequest, NextApiResponse } from 'next';
// Import MessageInterface from your types

export const config = {
  maxDuration: 60,
  api: {
    responseLimit: false,
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Parse the request body manually
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const data = JSON.parse(Buffer.concat(chunks).toString());
  const { messages, config: chatConfig, apiKey } = data;

  const anthropic = new Anthropic({
    apiKey: apiKey,
  });

  try {
    // Set standard SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    // Additional headers required by Anthropic
    res.setHeader('X-Accel-Buffering', 'no');
    res.setHeader('Transfer-Encoding', 'chunked');

    const streamMode = chatConfig?.stream ?? false;
    if (streamMode) {
      // Format messages for Anthropic API
      const formattedMessages = messages.map((msg: MessageInterface) => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content,
      }));

      const stream = await anthropic.messages.create({
        messages: formattedMessages,
        model: chatConfig.model,
        max_tokens: chatConfig.max_tokens,
        temperature: chatConfig.temperature,
        stream: true,
        // Add support for thinking mode if configured
        ...(chatConfig.enableThinking && {
          thinking: {
            type: 'enabled',
            budget_tokens: chatConfig.thinkingConfig?.budget_tokens || 16000
          }
        })
      });

      let lastPing = Date.now();
      const keepAliveInterval = setInterval(() => {
        if (Date.now() - lastPing >= 5000) {
          res.write(':keep-alive\n\n');
          lastPing = Date.now();
        }
      }, 5000);

      try {
        for await (const chunk of stream) {
          lastPing = Date.now();
          
          // Handle different types of chunks
          if (chunk.type === 'message_start') {
            res.write(`data: ${JSON.stringify({
              type: 'message_start',
              message: chunk.message,
            })}\n\n`);
          } else if (chunk.type === 'content_block_start') {
            // Add handling for thinking blocks
            if (chunk.content_block.type === 'thinking' || chunk.content_block.type === 'redacted_thinking') {
              res.write(`data: ${JSON.stringify({
                type: 'content_block_start',
                content_block: chunk.content_block,
              })}\n\n`);
            }
          } else if (chunk.type === 'content_block_delta') {
            res.write(`data: ${JSON.stringify({
              type: 'content_block_delta',
              delta: chunk.delta,
            })}\n\n`);
          } else if (chunk.type === 'signature_delta') {
            // Fix type comparison issue
            res.write(`data: ${JSON.stringify({
              type: 'signature_delta',
              signature: (chunk as unknown), // Replace any with unknown
            })}\n\n`);
          } else if (chunk.type === 'content_block_stop') {
            res.write(`data: ${JSON.stringify({
              type: 'content_block_stop',
              content_block: (chunk as ContentBlockStopEvent).content_block,
            })}\n\n`);
          } else if (chunk.type === 'message_delta') {
            res.write(`data: ${JSON.stringify({
              type: 'message_delta',
              delta: chunk.delta,
            })}\n\n`);
          } else if (chunk.type === 'message_stop') {
            res.write(`data: ${JSON.stringify({
              type: 'message_stop',
              message: (chunk as MessageStopEvent).message,
            })}\n\n`);
          }
        }
      } finally {
        clearInterval(keepAliveInterval);
        res.write('data: [DONE]\n\n');
        res.end();
      }
    } else {
      // Non-streaming response
      const response = await anthropic.messages.create({
        messages: messages.map((msg: MessageInterface) => ({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: msg.content,
        })),
        model: chatConfig.model,
        max_tokens: chatConfig.max_tokens,
        temperature: chatConfig.temperature,
      });

      res.status(200).json(response);
    }
  } catch (error: unknown) {
    console.error('Anthropic API Error:', error);
    
    // More detailed error logging
    if (error instanceof Anthropic.APIError) {
      console.error('Anthropic API Error details:', {
        status: error.status,
        type: error.type,
        message: error.message,
        details: error.error?.details
      });
    }
    
    // Create a more specific type for the error
    interface AnthropicError {
      status?: number;
      type?: string;
      error?: {
        details?: unknown;
      };
    }
    
    // Use type guards to safely access properties
    const errorStatus = error instanceof Error && 'status' in error 
      ? (error as AnthropicError).status 
      : 500;
      
    const errorType = error instanceof Error && 'type' in error 
      ? (error as AnthropicError).type 
      : undefined;
      
    const errorDetails = error instanceof Error && 'error' in error && (error as AnthropicError).error?.details
      ? (error as AnthropicError).error.details
      : undefined;
    
    res.status(errorStatus).json({
      error: error instanceof Error ? error.message : 'An error occurred during the API request',
      status: errorStatus,
      type: errorType,
      details: errorDetails,
    });
  }
}