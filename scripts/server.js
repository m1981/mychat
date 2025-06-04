import express from 'express';
import bodyParser from 'body-parser';
import http from 'http';
import { exec } from 'child_process';
import AnthropicClient from '../src/api/anthropic-client.js';

// Increase file descriptor limit
try {
  exec('ulimit -n 4096', (error) => {
    if (!error) console.log('Increased file descriptor limit to 4096');
    else console.log('Could not increase file descriptor limit automatically');
  });
} catch (e) {
  console.log('Could not increase file descriptor limit');
}

async function createServer() {
  const app = express();
  console.log('Starting Express server...');
  
  // Apply middlewares
  app.use(bodyParser.json({ limit: '10mb' }));
  
  // Add CORS headers for development
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    
    next();
  });
  
  // Anthropic API endpoint
  app.post('/api/chat/anthropic', async (req, res) => {
    console.log('Anthropic API request received');
    
    // For non-streaming responses, use JSON content type
    const isStreaming = req.body?.config?.stream === true;
    
    if (isStreaming) {
      // Set headers for SSE
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      
      // Disable Nagle's algorithm
      req.socket.setNoDelay(true);
    }
    
    // Generate a unique request ID
    const requestId = Date.now().toString(36);
    
    try {
      // Log the request body for debugging
      console.log('Request body:', JSON.stringify(req.body, null, 2));
      
      const { messages, config, apiKey } = req.body;
      
      // Validate required fields
      if (!apiKey) {
        return res.status(400).json({ 
          error: 'No API key found for Anthropic' 
        });
      }
      
      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({
          error: 'Messages array is required and must be an array'
        });
      }
      
      // Initialize Anthropic client using your wrapper class
      const anthropicClient = new AnthropicClient(apiKey, requestId);
      
      // Create default config if not provided
      const safeConfig = config || {};
      
      // Handle streaming response
      if (isStreaming) {
        // Set up keep-alive
        const keepAliveInterval = setInterval(() => {
          res.write(':keep-alive\n\n');
        }, 15000);
        
        try {
          // Create request params with safe defaults
          const requestParams = {
            model: safeConfig.model || 'claude-3-7-sonnet-20250219',
            max_tokens: safeConfig.max_tokens || 4096,
            temperature: safeConfig.temperature || 0.7,
            messages: messages
          };
          
          if (safeConfig.system) {
            requestParams.system = safeConfig.system;
          }
          
          console.log('Sending request to Anthropic with params:', JSON.stringify(requestParams, null, 2));
          
          // Use your client's streaming method
          const stream = await anthropicClient.createStreamingMessage(requestParams);
          
          // Process stream
          for await (const chunk of stream) {
            res.write(`data: ${JSON.stringify(chunk)}\n\n`);
          }
        } catch (error) {
          console.error('Stream error:', error);
          res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
        } finally {
          clearInterval(keepAliveInterval);
          res.write('data: [DONE]\n\n');
          res.end();
          console.log('Stream connection closed');
        }
      } else {
        // Non-streaming implementation
        try {
          // Create request params with safe defaults
          const requestParams = {
            model: safeConfig.model || 'claude-3-7-sonnet-20250219',
            max_tokens: safeConfig.max_tokens || 4096,
            temperature: safeConfig.temperature || 0.7,
            messages: messages
          };
          
          if (safeConfig.system) {
            requestParams.system = safeConfig.system;
          }
          
          console.log('Sending request to Anthropic with params:', JSON.stringify(requestParams, null, 2));
          
          // Use your client's non-streaming method
          const response = await anthropicClient.createMessage(requestParams);
          
          res.json(response);
        } catch (error) {
          console.error('API error:', error);
          res.status(500).json({ error: error.message });
        }
      }
    } catch (error) {
      console.error('Server error:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: error.message });
      } else if (isStreaming) {
        res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
        res.write('data: [DONE]\n\n');
        res.end();
      }
    }
  });

  // Health check endpoint
  app.get('/health', (_, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
  });
  
  // Create HTTP server
  const server = http.createServer(app);
  
  // Set server timeouts
  server.keepAliveTimeout = 65000;
  server.headersTimeout = 66000;
  
  // Start server
  server.listen(3000, () => {
    console.log('API server running at http://localhost:3000');
  });
  
  const gracefulShutdown = () => {
    console.log('Shutting down gracefully...');
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
    
    // Force close after 10s
    setTimeout(() => {
      console.log('Forcing shutdown');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);

  return { app, server };
}

createServer().catch((err) => {
  console.error('Error starting server:', err);
});