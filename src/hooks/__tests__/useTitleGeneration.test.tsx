import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTitleGeneration } from '@hooks/useTitleGeneration';
import { MessageInterface, ModelConfig } from '@type/chat';
import { ProviderContext } from '@contexts/ProviderContext';
import React from 'react';

// Mock store
const mockSetChats = vi.fn();
vi.mock('@store/store', () => ({
  default: {
    getState: () => ({
      chats: [
        { id: 'chat1', title: '', titleSet: false, messages: [] }
      ],
      currentChatIndex: 0
    }),
    setState: vi.fn(),
    getState: vi.fn().mockReturnValue({
      chats: [
        { id: 'chat1', title: '', titleSet: false, messages: [] }
      ],
      currentChatIndex: 0
    }),
    setChats: mockSetChats
  }
}));

// Mock provider
const mockProvider = {
  formatRequest: vi.fn().mockReturnValue({ messages: [], model: 'test-model' }),
  parseResponse: vi.fn().mockReturnValue({ content: 'Generated Title' }),
  submitCompletion: vi.fn().mockResolvedValue({ content: 'Generated Title' }),
  submitStream: vi.fn()
};

describe('useTitleGeneration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <ProviderContext.Provider value={mockProvider}>
      {children}
    </ProviderContext.Provider>
  );
  
  it('should generate a title for a chat', async () => {
    const { result } = renderHook(() => useTitleGeneration(), { wrapper });
    
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
    vi.mocked(vi.importActual('@store/store')).default.getState.mockReturnValueOnce({
      chats: [
        { id: 'chat1', title: 'Existing Title', titleSet: true, messages: [] }
      ],
      currentChatIndex: 0
    });
    
    const { result } = renderHook(() => useTitleGeneration(), { wrapper });
    
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
    
    const { result } = renderHook(() => useTitleGeneration(), { wrapper });
    
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