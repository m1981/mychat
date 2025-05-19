
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
  
  // Extract standardized parameters
  const { formattedRequest, apiKey } = data;

  if (!formattedRequest || !apiKey) {
    return res.status(400).json({ 
      error: 'Missing required parameters',
      status: 400
    });
  }

  const anthropic = new Anthropic({
    apiKey: apiKey,
  });

  try {
    if (formattedRequest.stream) {
      // Set up SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');

      // Keep-alive mechanism
      let lastPing = Date.now();
      const keepAliveInterval = setInterval(() => {
        if (Date.now() - lastPing >= 15000) {
          res.write(':keep-alive\n\n');
          lastPing = Date.now();
        }
      }, 15000);

      try {
        // Create streaming request to Anthropic
        const stream = await anthropic.messages.create({
          ...formattedRequest,
          stream: true
        });

        // Process each chunk
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
        ...formattedRequest,
        stream: false
      });

      // Return standardized response
      res.status(200).json({
        content: response.content,
        model: response.model,
        id: response.id,
        type: response.type
      });
    }
  } catch (error: any) {
    console.error('[Anthropic API] Error:', error);
    
    // Extract error details
    const errorStatus = error.status || 500;
    const errorMessage = error.message || 'Unknown error';
    const errorType = error.type || 'unknown_error';
    const errorDetails = error.error?.details || '';
    
    res.status(errorStatus).json({
      error: errorMessage,
      status: errorStatus,
      type: errorType,
      details: errorDetails
    });
  }
}