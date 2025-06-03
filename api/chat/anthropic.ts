import type { ContentBlockStopEvent, MessageStopEvent } from '@anthropic-ai/sdk';
import type { MessageInterface } from '@type/chat';
import type { NextApiRequest, NextApiResponse } from 'next';

import AnthropicClient from '../../src/api/anthropic-client';

export const config = {
  maxDuration: 120, // Increase to 2 minutes
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
  
  // Generate a unique request ID
  const requestId = Date.now().toString(36);

  try {
    // Set standard SSE headers immediately
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    // Additional headers required by Anthropic
    res.setHeader('X-Accel-Buffering', 'no');
    res.setHeader('Transfer-Encoding', 'chunked');

    // Initialize client with request ID for tracing
    const anthropicClient = new AnthropicClient(apiKey, requestId);

    const streamMode = chatConfig?.stream ?? false;
    if (streamMode) {
      // Format messages for Anthropic API
      const formattedMessages = messages.map((msg: MessageInterface) => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content,
      }));

      // Create request parameters
      const requestParams = {
        messages: formattedMessages,
        model: chatConfig.model,
        max_tokens: chatConfig.max_tokens,
        temperature: chatConfig.temperature,
      };
      
      // Add system message if present
      if (chatConfig.system) {
        requestParams.system = chatConfig.system;
      }

      const stream = await anthropicClient.createStreamingMessage(requestParams);

      // More frequent keep-alive pings (every 3 seconds)
      let lastPing = Date.now();
      const keepAliveInterval = setInterval(() => {
        if (Date.now() - lastPing >= 3000) {
          res.write(':keep-alive\n\n');
          lastPing = Date.now();
        }
      }, 3000);

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
            res.write(`data: ${JSON.stringify({
              type: 'signature_delta',
              signature: (chunk as unknown),
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
      const response = await anthropicClient.createMessage({
        messages: messages.map((msg: MessageInterface) => ({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: msg.content,
        })),
        model: chatConfig.model,
        max_tokens: chatConfig.max_tokens,
        temperature: chatConfig.temperature,
        system: chatConfig.system
      });

      res.status(200).json(response);
    }
  } catch (error: unknown) {
    console.error('Anthropic API Error:', error);
    
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
      : undefined;
      
    const errorType = error instanceof Error && 'type' in error 
      ? (error as AnthropicError).type 
      : undefined;
      
    const errorDetails = error instanceof Error && 'error' in error && (error as AnthropicError).error?.details
      ? (error as AnthropicError).error.details
      : undefined;
    
    res.status(500).json({
      error: error instanceof Error ? error.message : 'An error occurred during the API request',
      status: errorStatus,
      type: errorType,
      details: errorDetails,
    });
  }
}