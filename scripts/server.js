import express from 'express';
import { createServer as createViteServer } from 'vite';
import Anthropic from '@anthropic-ai/sdk';
import bodyParser from 'body-parser';

async function createServer() {
  const app = express();
  
  // Create Vite server in middleware mode
  const vite = await createViteServer({
    server: { middlewareMode: true }
  });
  
  app.use(vite.middlewares);
  app.use(bodyParser.json());
  
  // Anthropic API endpoint
  app.post('/api/chat/anthropic', async (req, res) => {
    console.log('📥 Anthropic API request received');
    const { messages, config, apiKey } = req.body;
    
    // Enhanced debugging
    console.log('📋 Request details:', {
      hasMessages: !!config.messages && Array.isArray(config.messages),
      messageCount: config.messages?.length || 0,
      hasApiKey: !!apiKey,
      requestedModel: config.model || 'default'
    });

    if (!apiKey) {
      console.log('❌ API key missing in request');
      return res.status(400).json({ error: 'No API key found for Anthropic. Please add your API key in settings.' });
    }

    try {
      const anthropic = new Anthropic({ apiKey });
      console.log('✅ Anthropic client initialized');

      // Handle streaming response
      if (config.stream) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');
        
        // Create request payload for Anthropic API
        const requestPayload = {
          model: model || 'claude-3-7-sonnet-20250219',
          max_tokens: max_tokens || 4096,
          temperature: temperature || 0.7,
          stream: true,
          messages: messages
        };
        
        // Add system message if present
        if (config.system) {
          requestPayload.system = config.system;
        }
        
        // Add messages
        requestPayload.messages = config.messages;
        
        console.log('🔧 Anthropic API request payload:', {
          model: requestPayload.model,
          hasSystem: !!requestPayload.system,
          messageCount: requestPayload.messages.length
        });
        
        const stream = await anthropic.messages.create(requestPayload);

        for await (const chunk of stream) {
          res.write(`data: ${JSON.stringify(chunk)}\n\n`);
        }
        
        res.write('data: [DONE]\n\n');
        res.end();
      } else {
        // Non-streaming implementation...
      }
    } catch (error) {
      // Error handling...
    }
  });

  const port = 3000;
  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });
}

createServer();