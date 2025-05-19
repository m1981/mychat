import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { MessageInterface, ModelConfig } from '@type/chat';
import React from 'react';

// Use vi.hoisted to create mock functions that can be used in vi.mock
const mocks = vi.hoisted(() => {
  return {
    setChats: vi.fn(),
    getState: vi.fn().mockReturnValue({
      chats: [
        { id: 'chat1', title: '', titleSet: false, messages: [] }
      ],
      currentChatIndex: 0
    }),
    provider: {
      formatRequest: vi.fn().mockReturnValue({ messages: [], model: 'test-model' }),
      // Return an object with content property instead of a string
      parseResponse: vi.fn().mockReturnValue({ content: 'Generated Title' }),
      submitCompletion: vi.fn().mockResolvedValue({ content: 'Generated Title' }),
      submitStream: vi.fn()
    }
  };
});

// Now use the hoisted mocks in vi.mock() calls
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

vi.mock('@config/models/model.registry', () => ({
  ModelRegistry: {
    getModelCapabilities: vi.fn().mockReturnValue({
      maxResponseTokens: 4096
    })
  }
}));

vi.mock('@contexts/ProviderContext', () => ({
  useProvider: () => mocks.provider
}));

vi.mock('@store/store', () => {
  // Create a function that takes a selector and returns the result of calling that selector on the mock store
  const useStoreMock = (selector) => selector({
    getState: mocks.getState,
    setState: vi.fn(),
    setChats: mocks.setChats
  });
  
  // Add getState as a static method on the function
  useStoreMock.getState = mocks.getState;
  
  return {
    default: useStoreMock
  };
});

// Import the hook after mocking
import { useTitleGeneration } from '@hooks/useTitleGeneration';

describe('useTitleGeneration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getState.mockReturnValue({
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
    expect(mocks.provider.formatRequest).toHaveBeenCalledWith(
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
    
    expect(mocks.provider.submitCompletion).toHaveBeenCalled();
    expect(mocks.provider.parseResponse).toHaveBeenCalled();
    
    // Verify chat was updated
    expect(mocks.setChats).toHaveBeenCalledWith([
      {
        id: 'chat1',
        title: 'Generated Title',
        titleSet: true,
        messages: [] // Include any other properties that should be in the updated chat
      }
    ]);
  });
  
  it('should not generate a title if chat already has one', async () => {
    // Mock store with a chat that already has a title
    mocks.getState.mockReturnValueOnce({
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
    expect(mocks.provider.formatRequest).not.toHaveBeenCalled();
    expect(mocks.provider.submitCompletion).not.toHaveBeenCalled();
    expect(mocks.setChats).not.toHaveBeenCalled();
  });
  
  it('should handle errors gracefully', async () => {
    // Mock provider to throw an error
    mocks.provider.submitCompletion.mockRejectedValueOnce(new Error('API Error'));
    
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