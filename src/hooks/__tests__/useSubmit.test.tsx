import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useSubmit from '../useSubmit';
import { DEFAULT_MODEL_CONFIG } from '@config/chat/ModelConfig';
import type { ModelConfig } from '@type/chat';
import useStore from '@store/store';
import { createWrapper } from '../../utils/test-utils';

// Mock the store
vi.mock('@store/store', () => ({
  default: vi.fn()
}));

// Mock API calls
vi.mock('@src/api/api', () => ({
  getChatCompletion: vi.fn()
}));

describe('useSubmit Hook', () => {
  const mockSetChats = vi.fn();
  const mockSetError = vi.fn();
  const mockSetGenerating = vi.fn();
  
  const defaultStoreState = {
    currentChatIndex: 0,
    chats: [{
      messages: [],
      title: '',
      id: '1',
      config: {
        provider: 'openai',
        modelConfig: DEFAULT_MODEL_CONFIG
      }
    }],
    apiKeys: {
      openai: 'test-key'
    },
    error: null,
    generating: false,
    setChats: mockSetChats,
    setError: mockSetError,
    setGenerating: mockSetGenerating
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useStore as any).mockImplementation((selector) => 
      selector(defaultStoreState)
    );
  });

  it('should handle successful message submission', async () => {
    const { result } = renderHook(() => useSubmit(), {
      wrapper: createWrapper()
    });

    const mockResponse = new ReadableStream({
      start(controller) {
        controller.enqueue(
          new TextEncoder().encode('data: {"content": "Hi there"}\n\n')
        );
        controller.close();
      }
    });

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      body: mockResponse,
      headers: new Headers({
        'content-type': 'text/event-stream'
      })
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(mockSetGenerating).toHaveBeenCalledWith(true);
    expect(mockSetChats).toHaveBeenCalled();
    expect(mockSetGenerating).toHaveBeenCalledWith(false);
  });

  it('should handle API errors', async () => {
    const { result } = renderHook(() => useSubmit(), {
      wrapper: createWrapper()
    });
    
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Server Error',
      text: () => Promise.resolve('Server error')
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(mockSetError).toHaveBeenCalledWith('HTTP error! status: 500');
    expect(mockSetGenerating).toHaveBeenCalledWith(false);
  });

  it('should handle network errors', async () => {
    const { result } = renderHook(() => useSubmit(), {
      wrapper: createWrapper()
    });
    
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(mockSetError).toHaveBeenCalledWith('Network error');
    expect(mockSetGenerating).toHaveBeenCalledWith(false);
  });

  it('should handle streaming data correctly', async () => {
    const { result } = renderHook(() => useSubmit(), {
      wrapper: createWrapper()
    });

    const mockResponse = new ReadableStream({
      start(controller) {
        controller.enqueue(
          new TextEncoder().encode('data: {"content": "Hello"}\n\n')
        );
        controller.enqueue(
          new TextEncoder().encode('data: {"content": " World"}\n\n')
        );
        controller.close();
      }
    });
    
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      body: mockResponse,
      headers: new Headers({
        'content-type': 'text/event-stream'
      })
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(mockSetChats).toHaveBeenCalled();
    expect(mockSetGenerating).toHaveBeenCalledWith(false);
  });
});