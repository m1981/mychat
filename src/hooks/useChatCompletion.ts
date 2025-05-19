import { useCallback } from 'react';
import { MessageInterface, ModelConfig } from '@type/chat';
import { useProvider } from '@contexts/ProviderContext';

export function useChatCompletion() {
  const provider = useProvider();
  
  const generateCompletion = useCallback(async (
    messages: MessageInterface[],
    config: ModelConfig
  ): Promise<string> => {
    try {
      const formattedRequest = provider.formatRequest(
        { ...config, stream: false },
        messages
      );
      
      const response = await provider.submitCompletion(formattedRequest);
      
      // Extract completion from response
      let content = '';
      if (typeof response.content === 'string') {
        content = response.content;
      } else if (response.choices && Array.isArray(response.choices)) {
        content = response.choices[0]?.message?.content || '';
      } else if (response.delta && typeof response.delta.text === 'string') {
        content = response.delta.text;
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
      const formattedRequest = provider.formatRequest(
        { ...config, stream: true },
        messages
      );
      
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
            content = parsed.choices?.[0]?.delta?.content || '';
          } catch (e) {
            // Not valid JSON
            continue;
          }
        } else {
          // Try parsing as JSON
          try {
            const parsed = JSON.parse(chunk);
            content = parsed.delta?.text || parsed.choices?.[0]?.delta?.content || '';
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