
/* eslint-env node */
import type { NextApiRequest, NextApiResponse } from 'next';
import { OpenAIClientAdapter } from '@api/clients/openai-client';
import { FormattedRequest } from '@type/provider';

// Add parseRequestBody function with proper typing
async function parseRequestBody(req: NextApiRequest): Promise<{
  readonly formattedRequest: FormattedRequest;
  readonly apiKey: string;
}> {
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

  try {
    // Parse the request body
    const { formattedRequest, apiKey } = await parseRequestBody(req);
    
    if (!apiKey) {
      return res.status(400).json({ error: 'API key is required' });
    }
    
    if (!formattedRequest) {
      return res.status(400).json({ error: 'Formatted request is required' });
    }
    
    // Use the same client adapter as the provider implementation
    const client = new OpenAIClientAdapter(apiKey);
    
    if (formattedRequest.stream) {
      // Handle streaming response
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      
      const stream = await client.createStreamingCompletion(formattedRequest);
      // Stream handling logic...
      // Implementation depends on how you want to handle the stream
    } else {
      // Handle non-streaming response
      const response = await client.createCompletion(formattedRequest);
      return res.status(200).json(response);
    }
  } catch (error: any) {
    console.error('OpenAI API error:', error);
    res.status(error.status || 500).json({ error: error.message });
  }
}