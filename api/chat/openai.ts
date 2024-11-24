// api/openai.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';

export const config = {
  maxDuration: 60, // Set maximum duration to 1 minute
  api: {
    responseLimit: false,
    bodyParser: false, // Disable body parsing for streams
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Parse the request body manually since bodyParser is disabled
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const data = JSON.parse(Buffer.concat(chunks).toString());
  const { messages, config: chatConfig, apiKey } = data;

  const openai = new OpenAI({
    apiKey: apiKey,
    timeout: 30000, // 30 second timeout for API requests
  });

  try {
    if (chatConfig.stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const stream = await openai.chat.completions.create({
        ...chatConfig,
        messages,
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
          res.write(`data: ${JSON.stringify(chunk)}\n\n`);
        }
      } finally {
        clearInterval(keepAliveInterval);
        res.write('data: [DONE]\n\n');
        res.end();
      }
    } else {
      const response = await openai.chat.completions.create({
        ...chatConfig,
        messages,
      });
      res.status(200).json(response);
    }
  } catch (error: any) {
    console.error('OpenAI API Error:', error);
    res.status(error.status || 500).json({
      error: error.message || 'An error occurred during the API request'
    });
  }
}