import { NextApiRequest, NextApiResponse } from 'next';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Anthropic from '@anthropic-ai/sdk';
import handler from '../anthropic';

// Mock Anthropic SDK
vi.mock('@anthropic-ai/sdk', () => {
  const mockStream = {
    [Symbol.asyncIterator]: async function* () {
      yield { type: 'message_start', message: { id: 'msg_123' } };
      yield { type: 'content_block_start', content_block: { type: 'text' } };
      yield { type: 'content_block_delta', delta: { text: 'Hello' } };
      yield { type: 'content_block_stop', content_block: { type: 'text' } };
      yield { type: 'message_stop', message: { id: 'msg_123' } };
    }
  };

  return {
    default: vi.fn().mockImplementation(() => ({
      messages: {
        create: vi.fn().mockResolvedValue(mockStream)
      }
    }))
  };
});

describe('Anthropic API Handler', () => {
  let req: Partial<NextApiRequest>;
  let res: Partial<NextApiResponse>;
  let mockCreateMethod: any;
  
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Setup request and response
    req = {
      method: 'POST',
      // Mock the async iterator for req
      [Symbol.asyncIterator]: async function* () {
        yield Buffer.from(JSON.stringify({
          // Update to match the expected format with formattedRequest wrapper
          formattedRequest: {
            messages: [{ role: 'user', content: 'Hello' }],
            system: 'You are a helpful assistant.',
            model: 'claude-3-5-sonnet-20240229',
            max_tokens: 1000,
            temperature: 0.7,
            stream: true,
            thinking: {
              type: 'enabled',
              budget_tokens: 10000
            }
          },
          apiKey: 'test-api-key'
        }));
      }
    };
    
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
      setHeader: vi.fn(),
      write: vi.fn(),
      end: vi.fn(),
      on: vi.fn().mockImplementation((event, callback) => {
        // Mock the 'on' method to store the callback
        return res;
      })
    };
    
    // Get reference to the mocked create method directly
    mockCreateMethod = vi.fn().mockResolvedValue({
      [Symbol.asyncIterator]: async function* () {
        yield { type: 'message_start', message: { id: 'msg_123' } };
        yield { type: 'content_block_delta', delta: { text: 'Hello' } };
        yield { type: 'message_stop', message: { id: 'msg_123' } };
      }
    });
    
    // Override the implementation to use our mockCreateMethod
    vi.mocked(Anthropic).mockImplementation(() => ({
      messages: {
        create: mockCreateMethod
      }
    } as unknown as Anthropic));
  });
  
  it('should return 405 for non-POST requests', async () => {
    req.method = 'GET';
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' });
  });
  
  it('should set correct headers for streaming response', async () => {
    await handler(req as NextApiRequest, res as NextApiResponse);
    
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/event-stream');
    expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-cache');
    expect(res.setHeader).toHaveBeenCalledWith('Connection', 'keep-alive');
    expect(res.setHeader).toHaveBeenCalledWith('X-Accel-Buffering', 'no');
  });
  
  it('should pass thinking parameters to Anthropic API when enabled', async () => {
    await handler(req as NextApiRequest, res as NextApiResponse);
    
    expect(mockCreateMethod).toHaveBeenCalledWith(
      expect.objectContaining({
        thinking: {
          type: 'enabled',
          budget_tokens: 10000
        }
      })
    );
  });
  
  it('should handle API errors gracefully', async () => {
    // Mock API error
    mockCreateMethod.mockRejectedValueOnce({
      status: 400,
      type: 'invalid_request_error',
      message: 'Invalid request',
      error: { details: 'Test error details' }
    });
    
    await handler(req as NextApiRequest, res as NextApiResponse);
    
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Invalid request',
        status: 400,
        type: 'invalid_request_error'
      })
    );
  });

  it('should send correctly formatted request body to Anthropic API', async () => {
    // Create a mock instance first to ensure we have a reference
    const mockAnthropicInstance = {
      messages: {
        create: vi.fn().mockResolvedValue({
          [Symbol.asyncIterator]: async function* () {
            yield { type: 'message_start', message: { id: 'msg_123' } };
            yield { type: 'content_block_delta', delta: { text: 'Hello' } };
            yield { type: 'message_stop', message: { id: 'msg_123' } };
          }
        })
      }
    };
    
    // Override the Anthropic mock to return our instance
    vi.mocked(Anthropic).mockImplementation(() => mockAnthropicInstance as unknown as Anthropic);
    
    // Now spy on the create method of our instance
    const createSpy = vi.spyOn(mockAnthropicInstance.messages, 'create');
    
    // Set up request with all possible parameters
    req = {
      method: 'POST',
      [Symbol.asyncIterator]: async function* () {
        yield Buffer.from(JSON.stringify({
          formattedRequest: {
            messages: [{ role: 'user', content: 'Hello' }],
            system: 'You are a helpful assistant.',
            model: 'claude-3-5-sonnet-20240229',
            max_tokens: 1000,
            temperature: 0.7,
            top_p: 0.9,
            stream: true,
            thinking: {
              type: 'enabled',
              budget_tokens: 10000
            }
          },
          apiKey: 'test-api-key'
        }));
      }
    };
    
    await handler(req as NextApiRequest, res as NextApiResponse);
    
    // Verify the exact structure of the request sent to Anthropic API
    expect(createSpy).toHaveBeenCalledWith(expect.objectContaining({
      messages: [{ role: 'user', content: 'Hello' }],
      system: 'You are a helpful assistant.',
      model: 'claude-3-5-sonnet-20240229',
      max_tokens: 1000,
      temperature: 0.7,
      top_p: 0.9,
      stream: true,
      thinking: {
        type: 'enabled',
        budget_tokens: 10000
      }
    }));
  });
});