
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

  // Parse the request body
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const data = JSON.parse(Buffer.concat(chunks).toString());
  
  // Extract standardized parameters
  const { formattedRequest, apiKey } = data;

  if (!formattedRequest || !apiKey) {
    return res.status(400).json({ 
      error: 'Missing required parameters',
      status: 400
    });
  }

  // Remove redundant config object if it exists
  if (formattedRequest.config) {
    console.warn('Redundant config object detected in request, removing');
    delete formattedRequest.config;
  }

  // Remove apiKey from formattedRequest if it was accidentally included
  if (formattedRequest.apiKey) {
    console.warn('API key found in formattedRequest, removing for security');
    delete formattedRequest.apiKey;
  }

  // Initialize OpenAI client with the API key from the request
  const openai = new OpenAI({
    apiKey: apiKey,
    timeout: 30000,
  });

  try {
    if (formattedRequest.stream) {
      // The OpenAI SDK automatically uses the correct endpoint
      // We don't need to specify it explicitly
      const streamResponse = await openai.chat.completions.create({
        ...formattedRequest,
        stream: true,
      });

      // Set up SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      // Keep-alive mechanism
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
      // The OpenAI SDK automatically uses the correct endpoint
      // We don't need to specify it explicitly
      const response = await openai.chat.completions.create({
        ...formattedRequest,
        stream: false,
      });

      // Return standardized response
      res.status(200).json({
        content: response.choices[0]?.message?.content || '',
        choices: response.choices,
        model: response.model,
        usage: response.usage
      });
    }
  } catch (error: unknown) {
    console.error('OpenAI API Error:', error);
    
    let errorStatus = 500;
    let errorMessage = 'An error occurred during the API request';
    
    if (error && typeof error === 'object' && 'status' in error) {
      errorStatus = (error as { status: number }).status;
    }
    
    if (error instanceof Error) {
      errorMessage = error.message;
      if ('status' in error) {
        errorStatus = (error as unknown as { status: number }).status;
      }
    }
    
    res.status(errorStatus).json({
      error: errorMessage
    });
  }
}