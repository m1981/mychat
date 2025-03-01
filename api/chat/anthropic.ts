import Anthropic, { APIError } from '@anthropic-ai/sdk';
import type {
  MessageParam,
  ThinkingConfigParam,
  ContentBlockStartEvent,
  MessageStartEvent,
  ContentBlockDeltaEvent,
  RawContentBlockStopEvent,
} from '@anthropic-ai/sdk/resources/messages/messages.js';
import type { NextApiRequest, NextApiResponse } from 'next';

import { MessageFormatter } from '../../src/lib/messageFormatter';
import type { MessageInterface } from '../../src/types/chat';
import type { RequestConfig } from '../../src/types/provider';

// Constants
const KEEP_ALIVE_INTERVAL = 15_000;
const DEFAULT_MAX_TOKENS = 1024;
const DEFAULT_TEMPERATURE = 0.7;
const MAX_TOKENS_LIMIT = 4096;

interface AnthropicRequestConfig extends RequestConfig {
  thinking?: ThinkingConfigParam;
}

interface AnthropicErrorResponse {
  type: string;
  error: {
    type: string;
    message: string;
    status?: number;
    details?: unknown;
  };
}

interface RequestBody {
  messages: MessageInterface[];
  config: AnthropicRequestConfig;
  apiKey: string;
}

interface StreamHandler {
  handleChunk: (chunk: any) => void;
  cleanup: () => void;
}

class AnthropicError extends Error {
  constructor(
    message: string,
    public status: number,
    public type: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AnthropicError';
  }
}

class AnthropicMessageHandler {
  private readonly client: Anthropic;
  
  constructor(apiKey: string) {
    if (!apiKey?.trim()) throw new Error('Anthropic API key is required');

    this.client = new Anthropic({ 
      apiKey,
      maxRetries: 3,
    });
  }

  private validateConfig(config: AnthropicRequestConfig) {
    const maxTokens = config.max_tokens || DEFAULT_MAX_TOKENS;
    if (maxTokens > MAX_TOKENS_LIMIT) {
      throw new Error(`Max tokens (${maxTokens}) exceeds limit (${MAX_TOKENS_LIMIT})`);
    }
  }

  private getMessageParams(messages: MessageInterface[], config: AnthropicRequestConfig) {
    return {
      messages: MessageFormatter.formatForAnthropic(messages) as MessageParam[],
      model: config.model,
      max_tokens: config.max_tokens || DEFAULT_MAX_TOKENS,
      temperature: config.temperature || DEFAULT_TEMPERATURE,
      ...(config.thinking && { thinking: config.thinking }),
    };
  }

  async handleStreamingMessage(messages: MessageInterface[], config: AnthropicRequestConfig) {
    this.validateConfig(config);
    return await this.client.messages.stream({
      ...this.getMessageParams(messages, config),
      stream: true,
    });
  }

  async handleNonStreamingMessage(messages: MessageInterface[], config: AnthropicRequestConfig) {
    this.validateConfig(config);
    return await this.client.messages.create(this.getMessageParams(messages, config));
  }
  }

function createStreamHandler(res: NextApiResponse): StreamHandler {
      let lastPing = Date.now();
      const keepAliveInterval = setInterval(() => {
    if (Date.now() - lastPing >= KEEP_ALIVE_INTERVAL && !res.writableEnded) {
            res.write('event: ping\ndata: {}\n\n');
            lastPing = Date.now();
          }
      }, KEEP_ALIVE_INTERVAL);

  const writeChunk = (data: any) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  return {
    handleChunk: (chunk: any) => {
      if (res.writableEnded) return;
          lastPing = Date.now();

      const handlers: Record<string, (chunk: any) => void> = {
        message_start: (c) => writeChunk({
                type: 'message_start',
          message: (c as MessageStartEvent).message,
        }),
        content_block_start: (c) => writeChunk({
                type: 'content_block_start',
          content_block: (c as ContentBlockStartEvent).content_block,
        }),
        content_block_delta: (c) => {
          if ((c as ContentBlockDeltaEvent).delta.type === 'text_delta') {
            writeChunk(c);
              }
        },
        content_block_stop: (c) => writeChunk({
                type: 'content_block_stop',
          index: (c as RawContentBlockStopEvent).index
        }),
        message_delta: (c) => writeChunk({
                type: 'message_delta',
          delta: c.delta,
        }),
        message_stop: () => writeChunk({
                type: 'message_stop'
        }),
      };

      const handler = handlers[chunk.type];
      if (handler) handler(chunk);
    },
    cleanup: () => {
        clearInterval(keepAliveInterval);
        if (!res.writableEnded) {
          res.write('data: [DONE]\n\n');
          res.end();
        }
      }
  };
}

function validateRequest(data: unknown): asserts data is RequestBody {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid request body');
  }

  const { messages, config, apiKey } = data as Partial<RequestBody>;

  if (!messages?.length || !Array.isArray(messages)) {
    throw new Error('Messages must be a non-empty array');
  }

  if (!config || typeof config !== 'object') {
    throw new Error('Config must be an object');
    }

  if (!apiKey?.trim()) {
    throw new Error('API key is required');
  }
}

function createErrorResponse(error: APIError<any>): AnthropicErrorResponse {
  return {
    type: 'error',
    error: {
      type: getErrorType(error.status),
      message: error.message || 'An unexpected error occurred',
      status: error.status,
      details: error.error && typeof error.error === 'object' ? 
        'details' in error.error ? error.error.details : undefined : undefined
    },
  };
}

function handleTimeoutError(res: NextApiResponse) {
  const timeoutResponse: AnthropicErrorResponse = {
    type: 'error',
    error: {
      type: 'timeout_error',
      message: 'Request timed out. Please try again with a shorter conversation or reduced max_tokens.',
      status: 504,
    },
  };
  return res.status(504).json(timeoutResponse);
  }

function sendErrorResponse(
  res: NextApiResponse,
  errorResponse: AnthropicErrorResponse,
  isStream: boolean
) {
  if (isStream) {
    res.write(`data: ${JSON.stringify(errorResponse)}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
  } else {
    res.status(errorResponse.error.status || 500).json(errorResponse);
  }
  }

function handleError(error: APIError<any>, res: NextApiResponse, isStream: boolean) {
  if (error.name === 'TimeoutError' || error.message?.includes('timeout')) {
    return handleTimeoutError(res);
  }

  const errorResponse = createErrorResponse(error);
  sendErrorResponse(res, errorResponse, isStream);
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

export const config = {
  maxDuration: 60,
  api: {
    responseLimit: false,
    bodyParser: false,
    externalResolver: true,
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

  let data: unknown;
  try {
    data = JSON.parse(Buffer.concat(chunks).toString());
    validateRequest(data);
  } catch (error) {
    return res.status(400).json({
      error: 'Invalid request format',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }

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
      const streamHandler = createStreamHandler(res);

      req.on('close', () => {
        stream.controller.abort(); // Abort stream if client disconnects
        streamHandler.cleanup();
      });

      try {
        for await (const chunk of stream) {
          if (res.writableEnded) break;
          streamHandler.handleChunk(chunk);
        }
      } finally {
        streamHandler.cleanup();
      }
    } else {
      // Non-streaming response
      const response = await anthropic.handleNonStreamingMessage(messages, chatConfig);
      res.status(200).json(response);
    }
  } catch (error) {
    handleError(error as APIError, res, Boolean(chatConfig.stream));
  }
}