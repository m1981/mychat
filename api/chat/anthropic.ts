// api/anthropic.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import Anthropic from '@anthropic-ai/sdk';

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
      const formattedMessages = messages.map(msg => ({
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
            // Add handling for thinking block signatures
            res.write(`data: ${JSON.stringify({
              type: 'signature_delta',
              signature: chunk.signature,
            })}\n\n`);
          } else if (chunk.type === 'content_block_stop') {
            res.write(`data: ${JSON.stringify({
              type: 'content_block_stop',
              content_block: chunk.content_block,
            })}\n\n`);
          } else if (chunk.type === 'message_delta') {
            res.write(`data: ${JSON.stringify({
              type: 'message_delta',
              delta: chunk.delta,
            })}\n\n`);
          } else if (chunk.type === 'message_stop') {
            res.write(`data: ${JSON.stringify({
              type: 'message_stop',
              message: chunk.message,
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
        messages: messages.map(msg => ({
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
    console.error('Anthropic API Error:', error);
    res.status(500).json({
      error: error.message || 'An error occurred during the API request',
      status: error.status,
      type: error.type,
      details: error.error?.details || undefined,
    });
  }
}