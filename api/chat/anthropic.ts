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

/**
 * Parses the request body from a NextApiRequest
 * This is needed because we disabled the built-in body parser
 */
async function parseRequestBody(req: NextApiRequest): Promise<any> {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString());
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Parse the request body
  const data = await parseRequestBody(req);
  const { 
    messages, 
    system, 
    model, 
    max_tokens, 
    temperature, 
    top_p, 
    stream, 
    thinking,
    config: chatConfig, 
    apiKey 
  } = data;

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

    const streamMode = stream ?? chatConfig?.stream ?? false;
    if (streamMode) {
      // Use the provider-formatted request parameters directly
      const requestParams = {
        messages,
        model: model || chatConfig?.model,
        max_tokens: max_tokens || chatConfig?.max_tokens,
        temperature: temperature || chatConfig?.temperature,
        top_p: top_p || chatConfig?.top_p,
        stream: true,
        // Use system parameter if provided
        ...(system && { system }),
        // Add thinking configuration if provided
        ...(thinking && { thinking })
      };

      const stream = await anthropic.messages.create(requestParams);

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
          
          // Use type discriminated unions for safer handling
          switch (chunk.type) {
            case 'message_start':
              res.write(`data: ${JSON.stringify({
                type: 'message_start',
                message: chunk.message,
              })}\n\n`);
              break;
              
            case 'content_block_start':
              // Handle thinking blocks
              if (chunk.content_block.type === 'thinking' || chunk.content_block.type === 'redacted_thinking') {
                res.write(`data: ${JSON.stringify({
                  type: 'content_block_start',
                  content_block: chunk.content_block,
                })}\n\n`);
              }
              break;
              
            case 'content_block_delta':
              res.write(`data: ${JSON.stringify({
                type: 'content_block_delta',
                delta: chunk.delta,
              })}\n\n`);
              break;
              
            case 'content_block_stop':
              res.write(`data: ${JSON.stringify({
                type: 'content_block_stop',
                content_block: chunk.content_block,
              })}\n\n`);
              break;
              
            case 'message_delta':
              res.write(`data: ${JSON.stringify({
                type: 'message_delta',
                delta: chunk.delta,
              })}\n\n`);
              break;
              
            case 'message_stop':
              res.write(`data: ${JSON.stringify({
                type: 'message_stop',
                message: chunk.message,
              })}\n\n`);
              break;
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
    
    // Simplified error handling with type guards
    let errorStatus = 500;
    let errorMessage = 'An error occurred during the API request';
    let errorType = 'unknown_error';
    let errorDetails = undefined;
    
    // Handle both Error objects and plain objects
    if (error && typeof error === 'object') {
      // Extract status if available
      if ('status' in error && typeof error.status === 'number') {
        errorStatus = error.status;
      }
      
      // Extract type if available
      if ('type' in error && typeof error.type === 'string') {
        errorType = error.type;
      }
      
      // Extract message from Error instances or plain objects
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if ('message' in error && typeof error.message === 'string') {
        errorMessage = error.message;
      }
      
      // Extract details if available
      if ('error' in error && error.error && typeof error.error === 'object' && 'details' in error.error) {
        errorDetails = error.error.details;
      }
    }
    
    // Log detailed error information
    console.error('Anthropic API Error details:', {
      status: errorStatus,
      type: errorType,
      message: errorMessage,
      details: errorDetails
    });
    
    res.status(errorStatus).json({
      error: errorMessage,
      status: errorStatus,
      type: errorType,
      details: errorDetails,
    });
  }
}