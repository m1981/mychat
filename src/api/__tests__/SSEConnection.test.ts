import type { NextApiResponse } from 'next';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Mock } from 'vitest';

import { SSEConnection } from '../base';

describe('SSEConnection', () => {
  let mockRes: NextApiResponse;
  let sseConnection: SSEConnection;
  
  beforeEach(() => {
    mockRes = {
      setHeader: vi.fn(),
      write: vi.fn(),
      end: vi.fn(),
      on: vi.fn(),
    } as unknown as NextApiResponse;
    
    // Mock Date.now for consistent timestamps
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('should set correct headers on initialization', () => {
    sseConnection = new SSEConnection(mockRes);
    
    expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'text/event-stream');
    expect(mockRes.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-cache');
    expect(mockRes.setHeader).toHaveBeenCalledWith('Connection', 'keep-alive');
    expect(mockRes.setHeader).toHaveBeenCalledWith('X-Accel-Buffering', 'no');
  });

  it('should send properly formatted SSE events', () => {
    sseConnection = new SSEConnection(mockRes);
    
    sseConnection.sendEvent('content', { message: 'test' });
    
    expect(mockRes.write).toHaveBeenCalledWith(
      'id: 1\nevent: content\ndata: {"message":"test"}\n\n'
    );
  });

  it('should increment event IDs', () => {
    sseConnection = new SSEConnection(mockRes);
    
    sseConnection.sendEvent('first', { count: 1 });
    sseConnection.sendEvent('second', { count: 2 });
    
    const calls = (mockRes.write as any).mock.calls;
    expect(calls[0][0]).toContain('id: 1');
    expect(calls[1][0]).toContain('id: 2');
  });

  it('should send heartbeat comments at specified intervals', () => {
    sseConnection = new SSEConnection(mockRes, 1000);
    
    vi.advanceTimersByTime(2500);
    
    expect(mockRes.write).toHaveBeenCalledWith(': heartbeat\n\n');
    expect(mockRes.write).toHaveBeenCalledTimes(2);
  });

  it('should clean up resources on end', () => {
    sseConnection = new SSEConnection(mockRes);
    
    sseConnection.end();
    
    expect(mockRes.write).toHaveBeenCalledWith(
      expect.stringContaining('event: done\ndata: "[DONE]"')
    );
    expect(mockRes.end).toHaveBeenCalled();
  });

  it('should handle connection close', () => {
    sseConnection = new SSEConnection(mockRes);
    
    // Simulate connection close
    type MockCall = [event: string, listener: Function];
    const mockCalls = (mockRes.on as Mock).mock.calls as MockCall[];
    const closeHandler = mockCalls.find(
      (call) => call[0] === 'close'
    )?.[1];
    
    if (closeHandler) {
      closeHandler();
      
      // Try to send event after close
      sseConnection.sendEvent('test', {});
      
      expect(mockRes.write).not.toHaveBeenCalled();
    }
  });
});