
/* eslint-env node */
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

      const requestParams = {
        ...chatConfig,
        messages,
        model: chatConfig.model || 'gpt-3.5-turbo',
        stream: true,
      };

      const streamResponse = await openai.chat.completions.create(
        requestParams as OpenAI.ChatCompletionCreateParamsStreaming
      );

      let lastPing = Date.now();
      const keepAliveInterval = setInterval(() => {
        if (Date.now() - lastPing >= 5000) {
          res.write(':keep-alive\n\n');
          lastPing = Date.now();
        }
      }, 5000);

      try {
        for await (const part of streamResponse) {
          lastPing = Date.now();
          res.write(`data: ${JSON.stringify(part)}\n\n`);
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
        model: chatConfig.model || 'gpt-3.5-turbo',
        stream: false,
      } as OpenAI.ChatCompletionCreateParamsNonStreaming);

      // Transform the response to match expected format
      res.status(200).json({
        content: response.choices[0]?.message?.content || ''
      });
    }
  } catch (error: unknown) {
    console.error('OpenAI API Error:', error);
    
    // More robust error handling
    let errorStatus = 500;
    let errorMessage = 'An error occurred during the API request';
    
    // Handle plain objects with status property
    if (error && typeof error === 'object' && 'status' in error) {
      errorStatus = (error as { status: number }).status;
    }
    
    // Handle Error instances
    if (error instanceof Error) {
      errorMessage = error.message;
      // Check for status property on Error instances too
      if ('status' in error) {
        errorStatus = (error as unknown as { status: number }).status;
      }
    }
    
    res.status(errorStatus).json({
      error: errorMessage
    });
  }
}