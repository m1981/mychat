export class ChatStreamHandler {
  private decoder: TextDecoder;
  private provider: any; // Replace 'any' with proper provider type
  private aborted: boolean = false;

  constructor(decoder: TextDecoder, provider: any) {
    this.decoder = decoder;
    this.provider = provider;
  }

  async processStream(
    reader: ReadableStreamDefaultReader<Uint8Array>,
    onContent: (content: string) => void
  ): Promise<void> {
    try {
      while (!this.aborted) {
        const { done, value } = await reader.read();
        
        if (done) {
          console.log('🏁 Stream ended. Done:', done, 'Aborted:', this.aborted);
          break;
        }

        const chunk = this.decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim() !== '');

        for (const line of lines) {
          if (this.aborted) break;
          
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              console.log('✅ Received [DONE] signal');
              continue;
            }

            try {
              const result = JSON.parse(data);
              const content = this.provider.parseStreamingResponse(result);
              if (content) {
                onContent(content);
              }
            } catch (e) {
              console.error('❌ Failed to parse chunk:', e);
            }
          }
        }
      }
    } catch (error) {
      console.error('Stream processing error:', error);
      throw error;
    }
  }

  abort(): void {
    this.aborted = true;
  }
}