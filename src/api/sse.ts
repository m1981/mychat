export class SSEConnection {
  private lastEventId: number = 0;
  private closed: boolean = false;
  private heartbeatInterval: NodeJS.Timeout;

  constructor(
    private res: NextApiResponse,
    private options: {
      heartbeatInterval?: number;
      clientId?: string;
    } = {}
  ) {
    this.setupConnection();
  }

  private setupConnection() {
    // CORS headers if needed
    this.res.setHeader('Access-Control-Allow-Origin', '*');
    this.res.setHeader('Access-Control-Allow-Methods', 'GET');
    this.res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // SSE headers
    this.res.setHeader('Content-Type', 'text/event-stream');
    this.res.setHeader('Cache-Control', 'no-cache, no-transform');
    this.res.setHeader('Connection', 'keep-alive');
    this.res.setHeader('X-Accel-Buffering', 'no');

    // Handle client disconnect
    this.res.on('close', () => {
      this.closed = true;
      clearInterval(this.heartbeatInterval);
      this.res.end();
    });

    // Setup heartbeat
    this.heartbeatInterval = setInterval(() => {
      if (!this.closed) {
        this.sendComment('heartbeat');
      }
    }, this.options.heartbeatInterval || 15000);
  }

  public sendEvent(event: string, data: unknown) {
    if (this.closed) return;

    const message = [
      `id: ${++this.lastEventId}`,
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
    clearInterval(this.heartbeatInterval);
    this.closed = true;
    this.res.end();
  }
}