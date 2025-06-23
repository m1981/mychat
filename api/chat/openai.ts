
/* eslint-env node */
import type { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';

// Add type safety with discriminated unions for OpenAI responses
type OpenAIResponse = {
  choices: ReadonlyArray<{
    readonly message?: { readonly content?: string };
    readonly delta?: { readonly content?: string };
  }>;
};

// Add type guard for OpenAI responses
function isOpenAIResponse(response: unknown): response is OpenAIResponse {
  if (!response || typeof response !== 'object') return false;
  
  const resp = response as Record<string, unknown>;
  return (
    resp.choices && 
    Array.isArray(resp.choices) && 
    resp.choices.length > 0 &&
    (resp.choices[0].message !== undefined || resp.choices[0].delta !== undefined)
  );
}

// Add parseRequestBody function with proper typing
async function parseRequestBody(req: NextApiRequest): Promise<{
  readonly formattedRequest: Readonly<{
    readonly model: string;
    readonly max_tokens: number;
    readonly temperature: number;
    readonly top_p: number;
    readonly presence_penalty?: number;
    readonly frequency_penalty?: number;
    readonly stream?: boolean;
    readonly messages: readonly unknown[];
  }>;
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
    const { formattedRequest, apiKey } = await parseRequestBody(req);
    
    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: apiKey
    });
    
    // Extract the request parameters directly
    const response = await openai.chat.completions.create({
      model: formattedRequest.model,
      max_tokens: formattedRequest.max_tokens,
      temperature: formattedRequest.temperature,
      top_p: formattedRequest.top_p,
      presence_penalty: formattedRequest.presence_penalty,
      frequency_penalty: formattedRequest.frequency_penalty,
      stream: formattedRequest.stream || false,
      messages: formattedRequest.messages
    });
    
    // Return the response
    res.status(200).json(response);
  } catch (error: any) {
    console.error('OpenAI API error:', error);
    res.status(error.status || 500).json({ error: error.message });
  }
}