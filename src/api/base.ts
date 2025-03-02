import type { NextApiResponse } from 'next';

export class SSEConnection {
  private lastEventId: number = 0;
  private closed: boolean = false;

  constructor(
    private res: NextApiResponse,
    private heartbeatInterval: number = 15000
  ) {
    this.setupConnection();
  }

  private setupConnection() {
    this.res.setHeader('Content-Type', 'text/event-stream');
    this.res.setHeader('Cache-Control', 'no-cache');
    this.res.setHeader('Connection', 'keep-alive');
    this.res.setHeader('X-Accel-Buffering', 'no');
    
    // Start heartbeat
    const heartbeat = setInterval(() => {
      if (this.closed) {
        clearInterval(heartbeat);
        return;
      }
      this.sendComment('heartbeat');
    }, this.heartbeatInterval);

    // Clean up on connection close
    this.res.on('close', () => {
      this.closed = true;
      clearInterval(heartbeat);
      this.res.end();
    });
  }

  public sendEvent(event: string, data: any) {
    if (this.closed) return;
    
    this.lastEventId++;
    const message = [
      `id: ${this.lastEventId}`,
      `event: ${event}`,
      `data: ${JSON.stringify(data)}`,
      '\n'
    ].join('\n');

    this.res.write(message);
  }

  public sendComment(comment: string) {
    if (this.closed) return;
    this.res.write(`: ${comment}\n\n`);
  }

  public end() {
    if (this.closed) return;
    this.sendEvent('done', '[DONE]');
    this.closed = true;
    this.res.end();
  }
}