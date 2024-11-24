import type { NextApiRequest, NextApiResponse } from 'next';
import { Configuration, OpenAIApi } from 'openai';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages, config, apiKey } = req.body;

  const configuration = new Configuration({
    apiKey: apiKey,
  });
  const openai = new OpenAIApi(configuration);

  try {
    if (config.stream) {
      const response = await openai.createChatCompletion({
        ...config,
        messages,
      }, { responseType: 'stream' });

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const stream = response.data;
      stream.on('data', (chunk: Buffer) => {
        res.write(chunk);
      });

      stream.on('end', () => {
        res.end();
      });
    } else {
      const response = await openai.createChatCompletion({
        ...config,
        messages,
      });

      res.status(200).json(response.data);
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}