
/* eslint-env node */
import Anthropic from '@anthropic-ai/sdk';
import type {
  ContentBlockStopEvent,
  MessageStopEvent
} from '@anthropic-ai/sdk';
import type { MessageInterface } from '@type/chat';
import type { NextApiRequest, NextApiResponse } from 'next';

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
async function parseRequestBody(req: NextApiRequest): Promise<{
  readonly formattedRequest?: Readonly<{
    readonly model: string;
    readonly max_tokens: number;
    readonly temperature: number;
    readonly top_p: number;
    readonly stream?: boolean;
    readonly messages: readonly unknown[];
    readonly system?: string;
    readonly thinking?: {
      readonly type: 'enabled' | 'disabled';
      readonly budget_tokens: number;
    };
  }>;
  readonly model?: string;
  readonly max_tokens?: number;
  readonly temperature?: number;
  readonly top_p?: number;
  readonly messages?: readonly unknown[];
  readonly system?: string;
  readonly thinking?: {
    readonly type: 'enabled' | 'disabled';
    readonly budget_tokens: number;
  };
  readonly apiKey: string;
}> {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString());
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Parse the request body
    const parsedBody = await parseRequestBody(req);
    
    // Support both formats: direct parameters or wrapped in formattedRequest
    const formattedRequest = parsedBody.formattedRequest || {
      model: parsedBody.model,
      max_tokens: parsedBody.max_tokens,
      temperature: parsedBody.temperature,
      top_p: parsedBody.top_p,
      messages: parsedBody.messages,
      system: parsedBody.system,
      thinking: parsedBody.thinking,
      stream: false
    };
    
    const apiKey = parsedBody.apiKey;
    
    // Initialize Anthropic client
    const anthropic = new Anthropic({
      apiKey: apiKey
    });
    
    // Create request parameters
    const requestParams: any = {
      model: formattedRequest.model,
      max_tokens: formattedRequest.max_tokens,
      temperature: formattedRequest.temperature,
      top_p: formattedRequest.top_p,
      stream: formattedRequest.stream || false,
      messages: formattedRequest.messages
    };
    
    // Add system message if present
    if (formattedRequest.system) {
      requestParams.system = formattedRequest.system;
    }
    
    // Add thinking configuration if present
    if (formattedRequest.thinking?.type === 'enabled') {
      requestParams.thinking = {
        enabled: true,
        budget_tokens: formattedRequest.thinking.budget_tokens
      };
    }
    
    // Create the message
    const response = await anthropic.messages.create(requestParams);
    
    // Return the response
    res.status(200).json(response);
  } catch (error: any) {
    console.error('Anthropic API error:', error);
    res.status(error.status || 500).json({ error: error.message });
  }
}