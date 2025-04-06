import { renderHook } from '@testing-library/react';
import { useSSE } from '../useSSE';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Mock EventSource globally
const mockEventSource = {
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  close: vi.fn()
};

const EventSourceMock = vi.fn(() => mockEventSource);
global.EventSource = EventSourceMock as any;

describe('useSSE Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock implementations
    mockEventSource.addEventListener.mockImplementation(() => {});
    mockEventSource.removeEventListener.mockImplementation(() => {});
    mockEventSource.close.mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  it('should initialize with basic configuration', () => {
    console.log('🔍 Test started');
    
    const onMessage = vi.fn();
    const url = 'http://test.com/stream';
    
    console.log('🔍 About to render hook');
    const { result } = renderHook(() => useSSE(url, { onMessage }));
    console.log('🔍 Hook rendered');
    
    expect(result.current).toBeDefined();
    expect(EventSourceMock).toHaveBeenCalledWith(url);
    
    console.log('🔍 EventSource calls:', EventSourceMock.mock.calls);
    console.log('🔍 Hook result:', result.current);
  });

  it('should set up message event listener', () => {
    console.log('🔍 Message listener test started');
    
    const onMessage = vi.fn();
    const url = 'http://test.com/stream';
    
    renderHook(() => useSSE(url, { onMessage }));
    
    // Verify addEventListener was called correctly
    expect(mockEventSource.addEventListener).toHaveBeenCalledWith(
      'message',
      onMessage
    );
    
    console.log('🔍 addEventListener calls:', mockEventSource.addEventListener.mock.calls);
  });

  it('should handle multiple messages', () => {
    console.log('🔍 Multiple messages test started');
    
    const messages: string[] = [];
    const onMessage = vi.fn((event) => {
      messages.push(event.data);
    });
    
    const url = 'http://test.com/stream';
    renderHook(() => useSSE(url, { onMessage }));

    // Simulate multiple SSE messages
    const messageEvent1 = new MessageEvent('message', { data: 'First message' });
    const messageEvent2 = new MessageEvent('message', { data: 'Second message' });
    
    // Get the message handler from the mock calls
    type MockCall = [event: string, listener: Function];
    const mockCalls = (mockEventSource.addEventListener as Mock).mock.calls as MockCall[];
    const messageHandler = mockCalls.find(
      (call) => call[0] === 'message'
    )?.[1];
    
    if (!messageHandler) {
      throw new Error('Message handler not found in mock calls');
    }
    
    // Simulate receiving messages
    messageHandler(messageEvent1);
    messageHandler(messageEvent2);
    
    expect(onMessage).toHaveBeenCalledTimes(2);
    expect(messages).toEqual(['First message', 'Second message']);
    
    console.log('🔍 Received messages:', messages);
  });

  it('should clean up on unmount', () => {
    console.log('🔍 Cleanup test started');
    
    const onMessage = vi.fn();
    const url = 'http://test.com/stream';
    
    // Render and unmount the hook
    const { unmount } = renderHook(() => useSSE(url, { onMessage }));
    
    console.log('🔍 About to unmount hook');
    unmount();
    console.log('🔍 Hook unmounted');

    // Verify cleanup
    expect(mockEventSource.removeEventListener).toHaveBeenCalledWith(
      'message',
      onMessage
    );
    expect(mockEventSource.close).toHaveBeenCalled();
    
    console.log('🔍 Cleanup verification complete');
  });

  it('should handle connection errors', async () => {
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
    const errorHandler = mockEventSource.addEventListener.mock.calls
      .find(call => call[0] === 'error')?.[1];
    
    if (errorHandler) {
      errorHandler(errorEvent);
      expect(onError).toHaveBeenCalledWith(errorEvent);
    }
  });

  it('should close connection when close() is called', async () => {
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