
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