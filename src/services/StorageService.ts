export interface QuotaConfig {
  maxStorageSize: number; // in bytes
  warningThreshold: number; // percentage (0-1)
}

export class StorageQuotaError extends Error {
  constructor(message: string, public availableSpace: number) {
    super(message);
    this.name = 'StorageQuotaError';
  }
}

export class StorageService {
  private readonly defaultConfig: QuotaConfig = {
    maxStorageSize: 5 * 1024 * 1024, // 5MB default
    warningThreshold: 0.9 // 90% warning threshold
  };

  private readonly finalConfig: QuotaConfig;

  constructor(private config: Partial<QuotaConfig> = {}) {
    this.finalConfig = { ...this.defaultConfig, ...config };
  }

  async checkQuota(): Promise<void> {
    try {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        const usage = estimate.usage || 0;
        const quota = estimate.quota || this.finalConfig.maxStorageSize;

        const availableSpace = quota - usage;

        if (availableSpace <= 0) {
          throw new StorageQuotaError(
            'Storage quota exceeded. Please clear some space.',
            availableSpace
          );
        }

        const usageRatio = usage / quota;
        if (usageRatio >= this.finalConfig.warningThreshold) {
          console.warn(`Storage usage is at ${(usageRatio * 100).toFixed(1)}%. Consider clearing some space.`);
        }
      } else {
        // Fallback for browsers without Storage API
        const localStorageSize = new Blob([JSON.stringify(localStorage)]).size;
        const availableSpace = this.finalConfig.maxStorageSize - localStorageSize;

        if (availableSpace <= 0) {
          throw new StorageQuotaError(
            'Local storage quota exceeded. Please clear some space.',
            availableSpace
          );
        }
      }
    } catch (error) {
      if (error instanceof StorageQuotaError) {
        throw error;
      }
      throw new Error('Failed to check storage quota: ' + (error as Error).message);
    }
  }

  async clearOldData(threshold: Date): Promise<void> {
    // Implementation for clearing old data
    // This would be implemented based on your specific storage structure
  }
}