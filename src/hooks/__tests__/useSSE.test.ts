import { renderHook } from '@testing-library/react';
import { setupTimers } from '@utils/test-utils';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { useSSE } from '../useSSE';

// Mock EventSource globally
type MockCall = [string, (event: MessageEvent) => void];

const mockEventSource = {
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  close: vi.fn()
};

const EventSourceMock = vi.fn(() => mockEventSource);
global.EventSource = EventSourceMock as unknown as typeof EventSource;

describe('useSSE Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock implementations
    mockEventSource.addEventListener.mockImplementation(() => {});
    mockEventSource.removeEventListener.mockImplementation(() => {});
    mockEventSource.close.mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // Setup and cleanup timers for each test
  setupTimers();

  it('should initialize with basic configuration', () => {
    const onMessage = vi.fn();
    const url = 'http://test.com/stream';
    
    const { result } = renderHook(() => useSSE(url, { onMessage }));
    
    expect(result.current).toBeDefined();
    expect(EventSourceMock).toHaveBeenCalledWith(url);
  });

  it('should set up message event listener', () => {
    const onMessage = vi.fn();
    const url = 'http://test.com/stream';
    
    renderHook(() => useSSE(url, { onMessage }));
    
    expect(mockEventSource.addEventListener).toHaveBeenCalledWith(
      'message',
      onMessage
    );
  });

  it('should handle multiple messages', () => {
    const messages: string[] = [];
    const onMessage = vi.fn((event) => {
      messages.push(event.data);
    });
    
    const url = 'http://test.com/stream';
    renderHook(() => useSSE(url, { onMessage }));

    const messageEvent1 = new MessageEvent('message', { data: 'First message' });
    const messageEvent2 = new MessageEvent('message', { data: 'Second message' });
    
    const mockCalls = vi.mocked(mockEventSource.addEventListener).mock.calls as MockCall[];
    const messageHandler = mockCalls.find(
      (call) => call[0] === 'message'
    )?.[1];
  });

  it('should clean up on unmount', () => {
    const onMessage = vi.fn();
    const url = 'http://test.com/stream';
    
    const { unmount } = renderHook(() => useSSE(url, { onMessage }));
    unmount();

    expect(mockEventSource.removeEventListener).toHaveBeenCalledWith(
      'message',
      onMessage
    );
    expect(mockEventSource.close).toHaveBeenCalled();
  });

  it('should handle connection errors', () => {
    const onMessage = vi.fn();
    const onError = vi.fn();
    const url = 'http://test.com/stream';
    
    renderHook(() => useSSE(url, { 
      onMessage,
      onError
    }));
    
    expect(mockEventSource.addEventListener).toHaveBeenCalledWith('message', onMessage);
    expect(mockEventSource.addEventListener).toHaveBeenCalledWith('error', onError);
    
    // Simulate error event
    const errorEvent = new Event('error');
    const errorHandler = vi.mocked(mockEventSource.addEventListener).mock.calls
      .find(call => call[0] === 'error')?.[1];
    
    if (errorHandler) {
      errorHandler(errorEvent);
      expect(onError).toHaveBeenCalledWith(errorEvent);
    }
  });

  it('should close connection when close() is called', () => {
    const onMessage = vi.fn();
    const url = 'http://test.com/stream';
    
    const { result } = renderHook(() => useSSE(url, { onMessage }));
    
    expect(EventSourceMock).toHaveBeenCalledWith(url);
    expect(mockEventSource.addEventListener).toHaveBeenCalledWith('message', onMessage);
    
    result.current.close();
    
    expect(mockEventSource.close).toHaveBeenCalled();
    expect(mockEventSource.removeEventListener).toHaveBeenCalledWith('message', onMessage);
  });
});