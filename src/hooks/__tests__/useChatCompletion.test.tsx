import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useChatCompletion } from '@hooks/useChatCompletion';
import { MessageInterface, ModelConfig } from '@type/chat';
import { ProviderContext } from '@contexts/ProviderContext';
import React from 'react';

// Mock provider
const mockProvider = {
  formatRequest: vi.fn().mockReturnValue({ messages: [], model: 'test-model' }),
  parseResponse: vi.fn().mockReturnValue({ content: 'Test response' }),
  submitCompletion: vi.fn().mockResolvedValue({ content: 'Test response' }),
  submitStream: vi.fn().mockResolvedValue({
    getReader: () => ({
      read: vi.fn()
        .mockResolvedValueOnce({
          value: new TextEncoder().encode('data: {"choices":[{"delta":{"content":"Test"}}]}'),
          done: false
        })
        .mockResolvedValueOnce({
          value: new TextEncoder().encode('data: {"choices":[{"delta":{"content":" response"}}]}'),
          done: false
        })
        .mockResolvedValueOnce({
          done: true
        })
    })
  })
};

describe('useChatCompletion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <ProviderContext.Provider value={mockProvider}>
      {children}
    </ProviderContext.Provider>
  );
  
  it('should generate a completion', async () => {
    const { result } = renderHook(() => useChatCompletion(), { wrapper });
    
    const messages: MessageInterface[] = [
      { id: '1', role: 'user', content: 'Hello' }
    ];
    
    const config: ModelConfig = {
      model: 'gpt-4o',
      temperature: 0.7,
      top_p: 1,
      max_tokens: 1000
    };
    
    let response;
    await act(async () => {
      response = await result.current.generateCompletion(messages, config);
    });
    
    // Verify provider methods were called correctly
    expect(mockProvider.formatRequest).toHaveBeenCalledWith(
      expect.objectContaining({ 
        model: 'gpt-4o',
        stream: false 
      }),
      messages
    );
    
    expect(mockProvider.submitCompletion).toHaveBeenCalled();
    expect(mockProvider.parseResponse).toHaveBeenCalled();
    
    // Verify response
    expect(response