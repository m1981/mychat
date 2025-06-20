
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
  try {
    // Parse the request body
    const { formattedRequest, apiKey } = await parseRequestBody(req);
    
    // Initialize Anthropic client
    const anthropic = new Anthropic({
      apiKey: apiKey
    });
    
    // Extract the request parameters directly
    const response = await anthropic.messages.create({
      model: formattedRequest.model,
      max_tokens: formattedRequest.max_tokens,
      temperature: formattedRequest.temperature,
      top_p: formattedRequest.top_p,
      stream: formattedRequest.stream || false,
      messages: formattedRequest.messages,
      system: formattedRequest.system
    });
    
    // Return the response
    res.status(200).json(response);
  } catch (error: any) {
    console.error('Anthropic API error:', error);
    res.status(error.status || 500).json({ error: error.message });
  }
}