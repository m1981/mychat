// api/anthropic.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import Anthropic from '@anthropic-ai/sdk';
import { MessageInterface } from '@type/chat';

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
    res.setHeader('X-Accel-Buffering', 'no');
    res.setHeader('Transfer-Encoding', 'chunked');

    if (chatConfig.stream) {
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
      });

      // Ping handling
      let lastPing = Date.now();
      const keepAliveInterval = setInterval(() => {
        if (Date.now() - lastPing >= 5000) {
          res.write('event: ping\ndata: {}\n\n');
          lastPing = Date.now();
        }
      }, 5000);

      try {
        for await (const chunk of stream) {
          lastPing = Date.now();
          
          // Send the event type and data
          if (chunk.type === 'content_block_delta') {
            res.write(`event: content_block_delta\ndata: ${JSON.stringify(chunk)}\n\n`);
          } else if (chunk.type === 'message_start') {
            res.write(`event: message_start\ndata: ${JSON.stringify(chunk)}\n\n`);
          } else if (chunk.type === 'message_delta') {
            res.write(`event: message_delta\ndata: ${JSON.stringify(chunk)}\n\n`);
          } else if (chunk.type === 'message_stop') {
            res.write(`event: message_stop\ndata: ${JSON.stringify(chunk)}\n\n`);
          } else {
            // Handle any other event types
            res.write(`event: ${chunk.type}\ndata: ${JSON.stringify(chunk)}\n\n`);
          }
        }
      } catch (streamError: any) {
        // Handle stream-specific errors
        const errorResponse = {
          type: 'error',
          error: {
            type: getErrorType(streamError.status),
            message: streamError.message || 'Stream error occurred'
          }
        };
        res.write(`event: error\ndata: ${JSON.stringify(errorResponse)}\n\n`);
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
  } catch (error: any) {
    // Handle non-stream errors
    const errorResponse = {
      type: 'error',
      error: {
        type: getErrorType(error.status),
        message: error.message || 'An error occurred'
      }
    };

    if (chatConfig.stream && !res.headersSent) {
      res.write(`event: error\ndata: ${JSON.stringify(errorResponse)}\n\n`);
      res.end();
    } else {
      res.status(error.status || 500).json(errorResponse);
    }
  }
}

function getErrorType(status: number): string {
  const errorTypes: Record<number, string> = {
    400: 'invalid_request_error',
    401: 'authentication_error',
    403: 'permission_error',
    404: 'not_found_error',
    413: 'request_too_large',
    429: 'rate_limit_error',
    500: 'api_error',
    529: 'overloaded_error'
  };
  return errorTypes[status] || 'api_error';
}