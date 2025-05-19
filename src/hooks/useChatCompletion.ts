import { useCallback } from 'react';
import { MessageInterface, ModelConfig } from '@type/chat';
import { useProvider } from '@contexts/ProviderContext';
import { RequestConfig } from '@type/provider';

export interface UseChatCompletionReturn {
  generateCompletion: (
    messages: MessageInterface[],
    config: ModelConfig
  ) => Promise<string>;
  
  generateCompletionStream: (
    messages: MessageInterface[],
    config: ModelConfig,
    onChunk: (chunk: string) => void
  ) => Promise<void>;
}

export function useChatCompletion(): UseChatCompletionReturn {
  const provider = useProvider();
  
  const generateCompletion = useCallback(async (
    messages: MessageInterface[],
    config: ModelConfig
  ): Promise<string> => {
    try {
      const requestConfig: RequestConfig = {
        ...config,
        stream: false
      };
      
      const formattedRequest = provider.formatRequest(requestConfig, messages);
      const response = await provider.submitCompletion(formattedRequest);
      const parsedResponse = provider.parseResponse(response);
      
      // Extract completion from response
      let content = '';
      if (typeof parsedResponse.content === 'string') {
        content = parsedResponse.content;
      } else if (parsedResponse.choices && Array.isArray(parsedResponse.choices)) {
        content = parsedResponse.choices[0]?.message?.content || '';
      }
      
      return content;
    } catch (error) {
      console.error('Error in completion generation:', error);
      throw error;
    }
  }, [provider]);
  
  const generateCompletionStream = useCallback(async (
    messages: MessageInterface[],
    config: ModelConfig,
    onChunk: (chunk: string) => void
  ): Promise<void> => {
    try {
      const requestConfig: RequestConfig = {
        ...config,
        stream: true
      };
      
      const formattedRequest = provider.formatRequest(requestConfig, messages);
      const stream = await provider.submitStream(formattedRequest);
      
      if (!stream) {
        throw new Error('Failed to get response stream');
      }
      
      const reader = stream.getReader();
      const decoder = new TextDecoder();
      
      let done = false;
      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        
        if (done) break;
        
        const chunk = decoder.decode(value);
        
        // Parse chunk based on format
        let content = '';
        
        // For OpenAI-style SSE format
        if (chunk.startsWith('data:')) {
          const data = chunk.replace(/^data: /, '').trim();
          if (data === '[DONE]') continue;
          
          try {
            const parsed = JSON.parse(data);
            const parsedResponse = provider.parseResponse(parsed);
            content = typeof parsedResponse.content === 'string' ? parsedResponse.content : '';
          } catch (e) {
            // Not valid JSON
            continue;
          }
        } else {
          // Try parsing as JSON
          try {
            const parsed = JSON.parse(chunk);
            const parsedResponse = provider.parseResponse(parsed);
            content = typeof parsedResponse.content === 'string' ? parsedResponse.content : '';
          } catch (e) {
            // Not JSON, might be plain text
            content = chunk;
          }
        }
        
        if (content) {
          onChunk(content);
        }
      }
    } catch (error) {
      console.error('Error in streaming completion:', error);
      throw error;
    }
  }, [provider]);
  
  return {
    generateCompletion,
    generateCompletionStream
  };
}