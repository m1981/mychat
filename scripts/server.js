import express from 'express';
import { createServer as createViteServer } from 'vite';
import Anthropic from '@anthropic-ai/sdk';
import bodyParser from 'body-parser';
import util from 'util';
import fs from 'fs';

// Create a debug log file
const debugLogStream = fs.createWriteStream('./server-debug.log', { flags: 'a' });

// Custom debug logger
const debug = {
  log: (...args) => {
    const timestamp = new Date().toISOString();
    const message = util.format(...args);
    const logMessage = `[${timestamp}] ${message}\n`;
    
    // Write to console
    process.stdout.write('\n' + logMessage);
    
    // Write to file
    debugLogStream.write(logMessage);
  },
  error: (...args) => {
    const timestamp = new Date().toISOString();
    const message = util.format(...args);
    const logMessage = `[${timestamp}] ERROR: ${message}\n`;
    
    // Write to console
    process.stderr.write('\n' + logMessage);
    
    // Write to file
    debugLogStream.write(logMessage);
  }
};

async function createServer() {
  const app = express();
  
  debug.log('Starting Express server...');
  
  // Create Vite server in middleware mode
  const vite = await createViteServer({
    server: { middlewareMode: true },
    logLevel: 'info' // Try different log levels: 'info', 'warn', 'error', 'silent'
  });
  
  app.use(vite.middlewares);
  app.use(bodyParser.json({ limit: '10mb' }));
  
  // Add request logging middleware
  app.use((req, res, next) => {
    debug.log(`${req.method} ${req.url}`);
    next();
  });
  
  // Anthropic API endpoint
  app.post('/api/chat/anthropic', async (req, res) => {
    debug.log('📥 Anthropic API request received');
    
    try {
      // Log request body with sensitive data redacted
      const sanitizedBody = { ...req.body };
      if (sanitizedBody.apiKey) sanitizedBody.apiKey = '[REDACTED]';
      debug.log('Request body:', sanitizedBody);
      
      const { messages, config, apiKey } = req.body;
      
      // Enhanced debugging
      debug.log('📋 Request details:', {
        hasMessages: !!config.messages && Array.isArray(config.messages),
        messageCount: config.messages?.length || 0,
        hasApiKey: !!apiKey,
        requestedModel: config.model || 'default'
      });

      if (!apiKey) {
        debug.log('❌ API key missing in request');
        return res.status(400).json({ error: 'No API key found for Anthropic. Please add your API key in settings.' });
      }

      try {
        const anthropic = new Anthropic({ apiKey });
        debug.log('✅ Anthropic client initialized');

        // Handle streaming response
        if (config.stream) {
          res.setHeader('Content-Type', 'text/event-stream');
          res.setHeader('Cache-Control', 'no-cache');
          res.setHeader('Connection', 'keep-alive');
          res.setHeader('X-Accel-Buffering', 'no');
          
          let keepAliveInterval;
          
          try {
            // Create request payload for Anthropic API
            const requestPayload = {
              model: config.model || 'claude-3-7-sonnet-20250219',
              max_tokens: config.max_tokens || 4096,
              temperature: config.temperature || 0.7,
              stream: true,
              messages: messages
            };
            
            // Add system message if present
            if (config.system) {
              requestPayload.system = config.system;
            }
            
            debug.log('🔧 Anthropic API request payload:', {
              model: requestPayload.model,
              hasSystem: !!requestPayload.system,
              messageCount: requestPayload.messages?.length || 0
            });
            
            const stream = await anthropic.messages.create(requestPayload);
            
            // Set up keep-alive interval
            let lastPing = Date.now();
            keepAliveInterval = setInterval(() => {
              if (Date.now() - lastPing >= 5000) {
                res.write(':keep-alive\n\n');
                lastPing = Date.now();
              }
            }, 5000);

            for await (const chunk of stream) {
              lastPing = Date.now();
              res.write(`data: ${JSON.stringify(chunk)}\n\n`);
            }
          } catch (error) {
            debug.error('❌ Stream processing error:', error);
          } finally {
            if (keepAliveInterval) clearInterval(keepAliveInterval);
            res.write('data: [DONE]\n\n');
            res.end();
            debug.log('✅ Stream connection closed properly');
          }
        } else {
          // Non-streaming implementation...
        }
      } catch (error) {
        debug.error('❌ Server error:', error);
        res.status(500).json({ error: `Server error: ${error.message}` });
      }
    } catch (error) {
      debug.error('❌ Server error:', error);
      res.status(500).json({ error: `Server error: ${error.message}` });
    }
  });

  const port = 3000;
  app.listen(port, '0.0.0.0', () => { // Listen on all interfaces
    console.log(`Server running at http://127.0.0.1:${port}`);
  });
}

// Add error handling for uncaught exceptions
process.on('uncaughtException', (error) => {
  debug.error('UNCAUGHT EXCEPTION:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  debug.error('UNHANDLED REJECTION:', { reason, promise });
});

createServer().catch((error) => {
  debug.error('Failed to start server:', error);
});