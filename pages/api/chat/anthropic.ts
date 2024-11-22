import type { NextApiRequest, NextApiResponse } from 'next';
import Anthropic from '@anthropic-ai/sdk';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages, config, apiKey } = req.body;

  const anthropic = new Anthropic({
    apiKey: apiKey,
  });

  try {
    if (config.stream) {
      const stream = await anthropic.messages.create({
        ...config,
        messages,
        stream: true,
      });

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      for await (const chunk of stream) {
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      }

      res.end();
    } else {
      const response = await anthropic.messages.create({
        ...config,
        messages,
      });

      res.status(200).json(response);
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}