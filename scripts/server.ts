
import { exec } from 'child_process';
import http from 'http';

import bodyParser from 'body-parser';
import express from 'express';

import { ProviderClientFactory } from '../src/api/clients/client-factory';
import { formatStreamingChunk } from '../src/api/utils/response-formatter';
import { ProviderKey, FormattedRequest } from '../src/types/provider';

// Configure logging
const logger = {
  info: (message: string, ...args: any[]) => {
    console.log(`[INFO] ${message}`, ...args);
  },
  error: (message: string, ...args: any[]) => {
    console.error(`[ERROR] ${message}`, ...args);
  },
  debug: (message: string, ...args: any[]) => {
    console.log(`[DEBUG] ${message}`, ...args);
  },
  request: (req: express.Request, message: string) => {
    console.log(`[REQUEST ${req.method} ${req.path}] ${message}`);
  }
};

// Helper function to redact sensitive information
function redactSensitiveInfo(obj: any): any {
  if (!obj) return obj;
  
  // Create a deep copy to avoid modifying the original
  const copy = JSON.parse(JSON.stringify(obj));
  
  // Redact API keys
  if (copy.apiKey) {
    copy.apiKey = copy.apiKey.substring(0, 8) + '...' + copy.apiKey.substring(copy.apiKey.length - 4);
  }
  
  return copy;
}

// Increase file descriptor limit
try {
  exec('ulimit -n 4096', (error) => {
    if (!error) logger.info('Increased file descriptor limit to 4096');
    else logger.error('Could not increase file descriptor limit automatically');
  });
} catch (e) {
  logger.error('Could not increase file descriptor limit');
}

async function createServer() {
  const app = express();
  logger.info('Starting Express server...');
  
  // Apply middlewares
  app.use(bodyParser.json({ limit: '10mb' }));
  
  // Request logging middleware
  app.use((req, res, next) => {
    logger.request(req, `Received request with content-type: ${req.headers['content-type']}`);
    next();
  });
  
  // Add CORS headers for development
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, X-Request-ID');
    
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    } 
    
    next();
  });
  
  // Generic API endpoint handler for all providers
  app.post('/api/chat/:provider', async (req, res) => {
    const provider = req.params.provider as ProviderKey;
    logger.info(`Processing request for provider: ${provider}`);
    
    try {
      // Log the raw request body for debugging
      logger.debug('Request body:', JSON.stringify(redactSensitiveInfo(req.body), null, 2));
      
      // Handle both formats: nested formattedRequest or direct parameters
      let formattedRequest: FormattedRequest;
      let apiKey: string;
      
      if (req.body.formattedRequest) {
        // Format 1: Nested formattedRequest object (preferred)
        ({ formattedRequest, apiKey } = req.body);
        logger.debug('Using nested formattedRequest format');
      } else if (req.body.model && req.body.messages) {
        // Format 2: Direct parameters at top level
        const { 
          apiKey: extractedApiKey, 
          model,
          max_tokens,
          temperature,
          top_p,
          presence_penalty,
          frequency_penalty,
          stream,
          messages,
          ...rest
        } = req.body;
        
        apiKey = extractedApiKey;
        formattedRequest = {
          model,
          max_tokens,
          temperature,
          top_p,
          presence_penalty,
          frequency_penalty,
          stream,
          messages,
          ...rest
        };
        
        logger.debug('Using direct parameters format, converted to formattedRequest');
      } else {
        // Neither format is valid
        logger.error(`Invalid request format for ${provider}`);
        logger.debug('Request body structure:', Object.keys(req.body));
        return res.status(400).json({ 
          error: 'Invalid request format. Must include either formattedRequest object or direct model parameters.' 
        });
      }
      
      // Validate API key
      if (!apiKey) {
        logger.error(`Missing API key for ${provider}`);
        return res.status(400).json({ error: 'API key is required' });
      }
      
      // Validate formatted request
      if (!formattedRequest || !formattedRequest.model || !formattedRequest.messages) {
        logger.error(`Invalid formatted request for ${provider}`);
        logger.debug('Formatted request structure:', formattedRequest ? Object.keys(formattedRequest) : 'undefined');
        return res.status(400).json({ error: 'Valid formatted request is required with model and messages' });
      }
      
      // Log request details
      logger.debug(`Request details for ${provider}:`, {
        model: formattedRequest.model,
        streaming: !!formattedRequest.stream,
        messageCount: formattedRequest.messages?.length || 0,
        hasApiKey: !!apiKey,
      });
      
      // Generate a unique request ID or use the one from headers
      const requestId = (req.headers['x-request-id'] as string) || Date.now().toString(36);
      logger.info(`Processing ${provider} request with ID: ${requestId}`);
      
      // Use the factory to create the appropriate client adapter
      logger.debug(`Creating client for ${provider}`);
      const client = ProviderClientFactory.createClient(provider, apiKey, requestId);
      
      if (formattedRequest.stream) {
        // Handle streaming response
        logger.info(`Starting streaming response for ${provider}`);
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        
        // Set up keep-alive
        const keepAliveInterval = setInterval(() => {
          res.write(':keep-alive\n\n');
        }, 15000);
        
        try {
          logger.debug(`Creating streaming completion for ${provider}`);
          const stream = await client.createStreamingCompletion(formattedRequest);
          
          // Process stream using shared formatter
          logger.debug(`Processing stream for ${provider}`);
          let chunkCount = 0;
          
          for await (const chunk of stream) {
            chunkCount++;
            if (chunkCount % 50 === 0) {
              logger.debug(`Processed ${chunkCount} chunks for ${provider}`);
            }
            
            const formattedChunk = formatStreamingChunk(chunk, provider);
            res.write(`data: ${JSON.stringify(formattedChunk)}\n\n`);
          }
          
          logger.info(`Streaming completed for ${provider}, sent ${chunkCount} chunks`);
        } catch (error: any) {
          logger.error(`Stream error for ${provider}:`, error);
          logger.debug(`Stream error details:`, {
            message: error.message,
            stack: error.stack,
            name: error.name
          });
          res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
        } finally {
          clearInterval(keepAliveInterval);
          res.write('data: [DONE]\n\n');
          res.end();
          logger.info(`Closed stream connection for ${provider}`);
        }
      } else {
        // Handle non-streaming response
        logger.info(`Creating non-streaming completion for ${provider}`);
        const response = await client.createCompletion(formattedRequest);
        logger.debug(`Received response from ${provider}:`, {
          responseId: response.id,
          model: response.model,
          choicesCount: response.choices?.length || 0,
          usage: response.usage
        });
        return res.status(200).json(response);
      }
    } catch (error: any) {
      logger.error(`${provider} API error:`, error);
      logger.debug(`Error details:`, {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      return res.status(500).json({ error: error.message });
    }
  });

  // Health check endpoint
  app.get('/health', (_, res) => {
    logger.info('Health check requested');
    res.json({ status: 'ok', uptime: process.uptime() });
  });
  
  // Create HTTP server
  const server = http.createServer(app);
  
  // Set server timeouts
  server.keepAliveTimeout = 65000;
  server.headersTimeout = 66000;
  
  // Start server
  server.listen(3000, () => {
    logger.info('API server running at http://localhost:3000');
  });
  
  const gracefulShutdown = () => {
    logger.info('Shutting down gracefully...');
    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
    
    // Force close after 10s
    setTimeout(() => {
      logger.error('Forcing shutdown');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);

  return { app, server };
}

// Add error handling for the main process
process.on('uncaughtException', (error) => {
  console.error('[FATAL] Uncaught exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[FATAL] Unhandled rejection at:', promise, 'reason:', reason);
});

createServer().catch((err) => {
  console.error('[FATAL] Error starting server:', err);
});