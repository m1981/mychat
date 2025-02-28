import './register';
import Anthropic, { APIError } from '@anthropic-ai/sdk';
import type {
  MessageParam,
  ThinkingConfigParam
} from '@anthropic-ai/sdk/resources/messages/messages.js';
import type { NextApiRequest, NextApiResponse } from 'next';

import { MessageFormatter } from '@src/lib/messageFormatter';
import { MessageInterface } from '@type/chat';
import { RequestConfig } from '@type/provider';

// Extend RequestConfig to include thinking mode
interface AnthropicRequestConfig extends RequestConfig {
  thinking?: ThinkingConfigParam;
}

interface AnthropicErrorResponse {
  type: string;
  error: {
    type: string;
    message: string;
    status?: number;
  };
}

class AnthropicMessageHandler {
  private client: Anthropic;
  
  constructor(apiKey: string) {
    if (!apiKey) throw new Error('Anthropic API key is required');
    this.client = new Anthropic({ 
      apiKey,
      maxRetries: 3,
    });
  }

  async handleStreamingMessage(messages: MessageInterface[], config: AnthropicRequestConfig) {
    const maxTokens = config.max_tokens || 1024;
    if (maxTokens > 4096) throw new Error('Max tokens exceeds limit');

    return await this.client.messages.stream({
      messages: MessageFormatter.formatForAnthropic(messages) as MessageParam[],  // Changed to MessageParam[]
      model: config.model,
      max_tokens: maxTokens,
      temperature: config.temperature || 0.7,
      ...(config.thinking && {
        thinking: config.thinking
      }),
      stream: true,
    });
  }

  async handleNonStreamingMessage(messages: MessageInterface[], config: AnthropicRequestConfig) {
    return await this.client.messages.create({
      messages: MessageFormatter.formatForAnthropic(messages) as MessageParam[],  // Changed to MessageParam[]
      model: config.model,
      max_tokens: config.max_tokens || 1024,
      temperature: config.temperature || 0.7,
      ...(config.thinking && {
        thinking: config.thinking
      })
    });
  }
}

export const config = {
  maxDuration: 60,
  api: {
    responseLimit: false,
    bodyParser: false,
    externalResolver: true, // Enable for better error handling
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Parse the request body manually
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const data = JSON.parse(Buffer.concat(chunks).toString());
  const { messages, config: chatConfig, apiKey } = data;

  const anthropic = new AnthropicMessageHandler(apiKey);

  try {
    // Set standard SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.setHeader('Transfer-Encoding', 'chunked');

    if (chatConfig.stream) {
      const stream = await anthropic.handleStreamingMessage(messages, chatConfig);
      
      // Improved keep-alive logic
      const KEEP_ALIVE_INTERVAL = 15000;
      let lastPing = Date.now();
      const keepAliveInterval = setInterval(() => {
        if (Date.now() - lastPing >= KEEP_ALIVE_INTERVAL) {
          if (!res.writableEnded) {
            res.write('event: ping\ndata: {}\n\n');
            lastPing = Date.now();
          }
        }
      }, KEEP_ALIVE_INTERVAL);

      req.on('close', () => {
        clearInterval(keepAliveInterval);
        stream.controller.abort(); // Abort stream if client disconnects
      });

      try {
        for await (const chunk of stream) {
          if (res.writableEnded) break;
          lastPing = Date.now();

          if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
            res.write(`data: ${JSON.stringify(chunk)}\n\n`);
          }
        }
      } finally {
        clearInterval(keepAliveInterval);
        if (!res.writableEnded) {
          res.write('data: [DONE]\n\n');
          res.end();
        }
      }
    } else {
      // Non-streaming response
      const response = await anthropic.handleNonStreamingMessage(messages, chatConfig);

      res.status(200).json(response);
    }
  } catch (error) {
    handleError(error as APIError, res, chatConfig.stream);
  }
}

function handleError(error: APIError<any>, res: NextApiResponse, isStream: boolean) {
  const errorResponse: AnthropicErrorResponse = {
    type: 'error',
    error: {
      type: getErrorType(error.status),
      message: error.message || 'An unexpected error occurred',
      status: error.status
    },
  };

  // Handle timeout specifically
  if (error.name === 'TimeoutError' || error.message?.includes('timeout')) {
    errorResponse.error.type = 'timeout_error';
    errorResponse.error.message = 'Request timed out. Please try again with a shorter conversation or reduced max_tokens.';
    return res.status(504).json(errorResponse);
  }

  if (isStream) {
    res.write(`data: ${JSON.stringify(errorResponse)}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
  } else {
    res.status(error.status || 500).json(errorResponse);
  }
}

function getErrorType(status: number | undefined): string {
  if (!status) return 'api_error';
  
  const errorTypes: Record<number, string> = {
    400: 'invalid_request_error',
    401: 'authentication_error',
    403: 'permission_error',
    404: 'not_found_error',
    413: 'request_too_large',
    429: 'rate_limit_error',
    500: 'api_error',
    529: 'overloaded_error'
  };
  return errorTypes[status] || 'api_error';
}