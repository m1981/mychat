import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { MessageInterface, ModelConfig } from '@type/chat';
import React from 'react';

// Mock the ProviderRegistry
vi.mock('@config/providers/provider.registry', () => ({
  ProviderRegistry: {
    getProvider: vi.fn().mockImplementation((key) => {
      if (key === 'openai') {
        return {
          id: 'openai',
          name: 'OpenAI',
          defaultModel: 'gpt-4o',
          endpoints: ['/api/chat/openai'],
          models: [
            {
              id: 'gpt-4o',
              name: 'GPT-4o',
              maxCompletionTokens: 16384,
              cost: {
                input: { price: 0.0025, unit: 1000 },
                output: { price: 0.01, unit: 1000 }
              }
            }
          ]
        };
      }
      if (key === 'anthropic') {
        return {
          id: 'anthropic',
          name: 'Anthropic',
          defaultModel: 'claude-3-7-sonnet-20250219',
          endpoints: ['/api/chat/anthropic'],
          models: [
            {
              id: 'claude-3-7-sonnet-20250219',
              name: 'Claude 3.7 Sonnet',
              maxCompletionTokens: 8192,
              cost: {
                input: { price: 0.003, unit: 1000 },
                output: { price: 0.015, unit: 1000 }
              }
            }
          ]
        };
      }
      return null;
    })
  }
}));

// Mock the ModelRegistry
vi.mock('@config/models/model.registry', () => ({
  ModelRegistry: {
    getModelCapabilities: vi.fn().mockReturnValue({
      maxResponseTokens: 4096
    })
  }
}));

// Mock the ProviderContext
vi.mock('@contexts/ProviderContext', () => ({
  useProvider: () => mockProvider
}));

// Setup mocks
const mockSetChats = vi.fn();
const mockGetState = vi.fn().mockReturnValue({
  chats: [
    { id: 'chat1', title: '', titleSet: false, messages: [] }
  ],
  currentChatIndex: 0
});

// Use vi.mock with a factory function that doesn't reference external variables
vi.mock('@store/store', () => {
  return {
    default: {
      getState: () => mockGetState(),
      setState: vi.fn(),
      setChats: (...args: any[]) => mockSetChats(...args)
    }
  };
});

// Mock provider
const mockProvider = {
  formatRequest: vi.fn().mockReturnValue({ messages: [], model: 'test-model' }),
  parseResponse: vi.fn().mockReturnValue('Generated Title'),
  submitCompletion: vi.fn().mockResolvedValue({ content: 'Generated Title' }),
  submitStream: vi.fn()
};

// Import the hook after mocking
import { useTitleGeneration } from '@hooks/useTitleGeneration';

describe('useTitleGeneration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetState.mockReturnValue({
      chats: [
        { id: 'chat1', title: '', titleSet: false, messages: [] }
      ],
      currentChatIndex: 0
    });
  });
  
  it('should generate a title for a chat', async () => {
    const { result } = renderHook(() => useTitleGeneration());
    
    const messages: MessageInterface[] = [
      { id: '1', role: 'user', content: 'What is React?' },
      { id: '2', role: 'assistant', content: 'React is a JavaScript library for building user interfaces.' }
    ];
    
    const config: ModelConfig = {
      model: 'gpt-4o',
      temperature: 0.7,
      top_p: 1,
      max_tokens: 1000
    };
    
    await act(async () => {
      await result.current.generateTitle(messages, config);
    });
    
    // Verify provider methods were called correctly
    expect(mockProvider.formatRequest).toHaveBeenCalledWith(
      expect.objectContaining({ 
        model: 'gpt-4o',
        stream: false 
      }),
      expect.arrayContaining([
        expect.objectContaining({ 
          role: 'system',
          content: expect.stringContaining('Generate a concise, descriptive title') 
        }),
        expect.objectContaining({ 
          role: 'user',
          content: expect.stringContaining('What is React?') 
        })
      ])
    );
    
    expect(mockProvider.submitCompletion).toHaveBeenCalled();
    expect(mockProvider.parseResponse).toHaveBeenCalled();
    
    // Verify chat was updated
    expect(mockSetChats).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'chat1',
          title: 'Generated Title',
          titleSet: true
        })
      ])
    );
  });
  
  it('should not generate a title if chat already has one', async () => {
    // Mock store with a chat that already has a title
    mockGetState.mockReturnValueOnce({
      chats: [
        { id: 'chat1', title: 'Existing Title', titleSet: true, messages: [] }
      ],
      currentChatIndex: 0
    });
    
    const { result } = renderHook(() => useTitleGeneration());
    
    const messages: MessageInterface[] = [
      { id: '1', role: 'user', content: 'What is React?' },
      { id: '2', role: 'assistant', content: 'React is a JavaScript library for building user interfaces.' }
    ];
    
    const config: ModelConfig = {
      model: 'gpt-4o',
      temperature: 0.7,
      top_p: 1,
      max_tokens: 1000
    };
    
    await act(async () => {
      await result.current.generateTitle(messages, config);
    });
    
    // Verify provider methods were not called
    expect(mockProvider.formatRequest).not.toHaveBeenCalled();
    expect(mockProvider.submitCompletion).not.toHaveBeenCalled();
    expect(mockSetChats).not.toHaveBeenCalled();
  });
  
  it('should handle errors gracefully', async () => {
    // Mock provider to throw an error
    mockProvider.submitCompletion.mockRejectedValueOnce(new Error('API Error'));
    
    const { result } = renderHook(() => useTitleGeneration());
    
    const messages: MessageInterface[] = [
      { id: '1', role: 'user', content: 'What is React?' },
      { id: '2', role: 'assistant', content: 'React is a JavaScript library for building user interfaces.' }
    ];
    
    const config: ModelConfig = {
      model: 'gpt-4o',
      temperature: 0.7,
      top_p: 1,
      max_tokens: 1000
    };
    
    // Mock console.error to prevent test output noise
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    await act(async () => {
      // This should not throw despite the API error
      await result.current.generateTitle(messages, config);
    });
    
    // Verify error was logged
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Error in title generation:',
      expect.any(Error)
    );
    
    consoleErrorSpy.mockRestore();
  });
});