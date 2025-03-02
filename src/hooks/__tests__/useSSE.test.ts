import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react-hooks';
import { useSSE } from '../useSSE';

// Mock EventSource
const mockEventSource = {
  close: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
};

// Create EventSource constructor mock
const EventSourceMock = vi.fn(() => mockEventSource);

// Setup global mock
vi.stubGlobal('EventSource', EventSourceMock);

describe('useSSE Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    console.log('🔍 Mocks cleared');
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
    
    const messages = [];
    const onMessage = vi.fn((event) => {
      messages.push(event.data);
    });
    
    const url = 'http://test.com/stream';
    renderHook(() => useSSE(url, { onMessage }));

    // Simulate multiple SSE messages
    const messageEvent1 = new MessageEvent('message', { data: 'First message' });
    const messageEvent2 = new MessageEvent('message', { data: 'Second message' });
    
    // Get the message handler from the mock calls
    const messageHandler = mockEventSource.addEventListener.mock.calls.find(
      call => call[0] === 'message'
    )[1];
    
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

  it('should handle connection errors', () => {
    console.log('🔍 Error handling test started');
    
    const onMessage = vi.fn();
    const onError = vi.fn();
    const url = 'http://test.com/stream';
    
    renderHook(() => useSSE(url, { 
      onMessage,
      onError
    }));
    
    // Verify both message and error listeners were added
    expect(mockEventSource.addEventListener).toHaveBeenCalledWith('message', onMessage);
    expect(mockEventSource.addEventListener).toHaveBeenCalledWith('error', onError);
    
    // Simulate an error event
    const errorEvent = new Event('error');
    const errorHandler = mockEventSource.addEventListener.mock.calls.find(
      call => call[0] === 'error'
    )[1];
    
    console.log('🔍 Simulating error event');
    errorHandler(errorEvent);
    
    // Verify error was handled
    expect(onError).toHaveBeenCalledWith(errorEvent);
    console.log('🔍 Error handler called');
  });

  it('should close connection when close() is called', () => {
    console.log('🔍 Close test started');
    
    const onMessage = vi.fn();
    const url = 'http://test.com/stream';
    
    // Render hook and get close function
    const { result } = renderHook(() => useSSE(url, { onMessage }));
    
    // Verify EventSource was created and listener was added
    expect(EventSourceMock).toHaveBeenCalledWith(url);
    expect(mockEventSource.addEventListener).toHaveBeenCalledWith('message', onMessage);
    
    // Call close
    result.current.close();
    
    // Verify cleanup occurred
    expect(mockEventSource.close).toHaveBeenCalled();
    expect(mockEventSource.removeEventListener).toHaveBeenCalledWith('message', onMessage);
  });
});