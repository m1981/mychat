import { MessageInterface, ModelConfig } from '@type/chat';
import { AIProviderInterface } from '@type/provider';

export class ChatCompletionService {
  private provider: AIProviderInterface;
  
  constructor(provider: AIProviderInterface) {
    this.provider = provider;
  }
  
  async generateCompletion(
    messages: MessageInterface[],
    config: ModelConfig
  ): Promise<string> {
    try {
      const formattedRequest = this.provider.formatRequest(
        { ...config, stream: false },
        messages
      );
      
      const response = await this.provider.submitCompletion(formattedRequest);
      return this.extractCompletionFromResponse(response);
    } catch (error) {
      console.error('Error generating completion:', error);
      throw new Error('Failed to generate completion');
    }
  }
  
  async generateCompletionStream(
    messages: MessageInterface[],
    config: ModelConfig,
    onChunk: (chunk: string) => void
  ): Promise<void> {
    try {
      const formattedRequest = this.provider.formatRequest(
        { ...config, stream: true },
        messages
      );
      
      const stream = await this.provider.submitStream(formattedRequest);
      
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
        const parsedChunk = this.parseStreamChunk(chunk);
        
        if (parsedChunk) {
          onChunk(parsedChunk);
        }
      }
    } catch (error) {
      console.error('Error in completion stream:', error);
      throw new Error('Failed to generate streaming completion');
    }
  }
  
  private extractCompletionFromResponse(response: any): string {
    try {
      // Handle different response formats from various providers
      if (typeof response.content === 'string') {
        return response.content;
      } else if (response.choices && Array.isArray(response.choices)) {
        // OpenAI format
        return response.choices[0]?.message?.content || 
               response.choices[0]?.delta?.content || '';
      } else if (response.delta && typeof response.delta.text === 'string') {
        // Anthropic format
        return response.delta.text;
      }
      
      return '';
    } catch (error) {
      console.error('Error extracting completion from response:', error);
      return '';
    }
  }
  
  private parseStreamChunk(chunk: string): string | null {
    try {
      // Different providers have different streaming formats
      // This is a simplified example - actual implementation would need to handle
      // provider-specific formats
      
      // For OpenAI-style SSE format
      if (chunk.startsWith('data:')) {
        const data = chunk.replace(/^data: /, '').trim();
        if (data === '[DONE]') return null;
        
        try {
          const parsed = JSON.parse(data);
          return parsed.choices?.[0]?.delta?.content || '';
        } catch (e) {
          return null;
        }
      }
      
      // For raw JSON chunks (some providers)
      try {
        const parsed = JSON.parse(chunk);
        return parsed.delta?.text || parsed.choices?.[0]?.delta?.content || '';
      } catch (e) {
        // Not JSON, might be plain text
        return chunk;
      }
    } catch (error) {
      console.error('Error parsing stream chunk:', error);
      return null;
    }
  }
}