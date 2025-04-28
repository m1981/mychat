export interface SimulationConfig {
  delay?: number;
  chunkSize?: number;
  errorProbability?: number;
}

export class SimulationService {
  private readonly defaultConfig: SimulationConfig = {
    delay: 200,      // Increased from 50 to 200ms
    chunkSize: 1,    // Reduced from 2 to 1 for word-by-word display
    errorProbability: 0
  };

  constructor(private config: SimulationConfig = {}) {
    this.config = { ...this.defaultConfig, ...config };
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async simulateStreamResponse(
    content: string,
    onContent: (content: string) => void
  ): Promise<void> {
    const { delay, chunkSize, errorProbability } = this.config;

    if (Math.random() < errorProbability!) {
      throw new Error('Simulated stream error');
    }

    const words = content.split(' ');
    
    for (let i = 0; i < words.length; i += chunkSize!) {
      const chunk = words.slice(i, i + chunkSize!).join(' ') + ' ';
      onContent(chunk);
      await this.sleep(delay!);
    }
  }
}