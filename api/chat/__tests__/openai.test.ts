import { NextApiRequest, NextApiResponse } from 'next';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import OpenAI from 'openai';
import handler from '../openai';

// Mock OpenAI SDK
vi.mock('openai', () => {
  const mockStream = {
    [Symbol.asyncIterator]: async function* () {
      yield { id: 'chatcmpl-123', choices: [{ delta: { content: 'Hello' } }] };
      yield { id: 'chatcmpl-123', choices: [{ delta: { content: ' world' } }] };
    }
  };

  return {
    default: vi.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: vi.fn().mockResolvedValue(mockStream)
        }
      }
    }))
  };
});

describe('OpenAI API Handler', () => {
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
          messages: [{ role: 'user', content: 'Hello' }],
          config: {
            model: 'gpt-4',
            max_tokens: 1000,
            temperature: 0.7,
            stream: true
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
      end: vi.fn()
    };
    
    // Get reference to the mocked create method directly
    mockCreateMethod = vi.fn().mockResolvedValue({
      [Symbol.asyncIterator]: async function* () {
        yield { id: 'chatcmpl-123', choices: [{ delta: { content: 'Hello' } }] };
        yield { id: 'chatcmpl-123', choices: [{ delta: { content: ' world' } }] };
      }
    });
    
    // Override the implementation to use our mockCreateMethod
    vi.mocked(OpenAI).mockImplementation(() => ({
      chat: {
        completions: {
          create: mockCreateMethod
        }
      }
    } as unknown as OpenAI));
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
  });
  
  it('should handle API errors gracefully', async () => {
    // Mock API error - create an actual Error object with status property
    const apiError = new Error('Invalid request');
    Object.assign(apiError, { status: 400 });
    mockCreateMethod.mockRejectedValueOnce(apiError);
    
    await handler(req as NextApiRequest, res as NextApiResponse);
    
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Invalid request'
      })
    );
  });
});