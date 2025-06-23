import { AIProviderInterface } from '@type/provider';
import { debug } from '@utils/debug';

export class ChatStreamHandler {
  private decoder: TextDecoder;
  private provider: AIProviderInterface;
  private aborted: boolean = false;

  constructor(decoder: TextDecoder, provider: AIProviderInterface) {
    this.decoder = decoder;
    this.provider = provider;
    
    debug.log('stream', `🔧 ChatStreamHandler created for provider: ${provider?.id || 'unknown'}`);
    
    if (!provider) {
      debug.error('stream', '❌ Provider is undefined in ChatStreamHandler constructor');
    }
  }

  async processStream(
    reader: ReadableStreamDefaultReader<Uint8Array>,
    onContent: (content: string) => void
  ): Promise<void> {
    debug.log('stream', '🔄 Starting to process stream');
    
    if (!reader) {
      debug.error('stream', '❌ Reader is undefined in processStream');
      throw new Error('Reader is undefined');
    }
    
    if (!onContent) {
      debug.error('stream', '❌ Content callback is undefined in processStream');
      throw new Error('Content callback is undefined');
    }
    
    try {
      while (!this.aborted) {
        const { done, value } = await reader.read();
        
        if (done) {
          debug.log('stream', '🏁 Stream ended. Done:', done, 'Aborted:', this.aborted);
          break;
        }

        const chunk = this.decoder.decode(value);
        debug.log('stream', `📦 Received chunk of size: ${chunk.length} bytes`);
        
        const lines = chunk.split('\n').filter(line => line.trim() !== '');
        debug.log('stream', `📝 Processing ${lines.length} lines from chunk`);

        for (const line of lines) {
          if (this.aborted) {
            debug.log('stream', '🛑 Processing aborted during line processing');
            break;
          }
          
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              debug.log('stream', '✅ Received [DONE] signal');
              continue;
            }

            try {
              const result = JSON.parse(data);
              debug.log('stream', '🔍 Parsing streaming response');
              
              if (!this.provider) {
                debug.error('stream', '❌ Provider is undefined when parsing streaming response');
                continue;
              }
              
              const content = this.provider.parseStreamingResponse(result);
              if (content) {
                debug.log('stream', `📤 Sending content: "${content.substring(0, 20)}${content.length > 20 ? '...' : ''}"`);
                onContent(content);
              }
            } catch (e) {
              debug.error('stream', '❌ Failed to parse chunk:', e);
            }
          }
        }
      }
    } catch (error) {
      debug.error('stream', '❌ Stream processing error:', error);
      throw error;
    }
  }

  abort(): void {
    debug.log('stream', '🛑 Aborting stream processing');
    this.aborted = true;
  }
}