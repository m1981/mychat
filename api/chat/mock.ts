// api/chat/mock.ts
import type { NextApiRequest, NextApiResponse } from 'next';

export const config = {
  maxDuration: 60,
  api: {
    responseLimit: false,
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('Mock API handler called');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Set standard SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Get delay from query params or use default
  const delay = parseInt(req.query.delay as string) || 200;
  const totalMessages = parseInt(req.query.messages as string) || 50;
  const provider = req.query.provider as string || 'anthropic';

  console.log(`Mock API: provider=${provider}, delay=${delay}, messages=${totalMessages}`);

  let lastPing = Date.now();
  const keepAliveInterval = setInterval(() => {
    if (Date.now() - lastPing >= 5000) {
      res.write(':keep-alive\n\n');
      lastPing = Date.now();
    }
  }, 5000);

  try {
    // Simulate streaming response based on provider
    for (let i = 0; i < totalMessages; i++) {
      // Check if client disconnected
      if (req.socket.destroyed) {
        console.log('Client disconnected, stopping stream');
        break;
      }
      
      lastPing = Date.now();
      
      if (provider === 'openai') {
        // OpenAI format
        res.write(`data: ${JSON.stringify({
          choices: [{
            delta: { content: `Mock message ${i} ` }
          }]
        })}\n\n`);
      } else {
        // Anthropic format
        res.write(`data: ${JSON.stringify({
          type: 'content_block_delta',
          delta: { text: `Mock message ${i} ` }
        })}\n\n`);
      }
      
      // Artificial delay
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    // Send completion message
    res.write('data: [DONE]\n\n');
  } catch (error) {
    console.error('Error in mock API:', error);
  } finally {
    clearInterval(keepAliveInterval);
    res.end();
  }
}