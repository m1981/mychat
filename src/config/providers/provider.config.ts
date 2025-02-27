// src/config/providers/provider.config.ts

import { ProviderKey } from '@type/chat';

export interface ProviderModel {
  id: string;
  name: string;
  /**
   * Total number of tokens (input + output) that can be processed
   * Example: 200000 for Claude-3.7
   */
  contextWindow: number;

  /**
   * Maximum number of tokens that can be generated in response
   * Must be less than contextWindow
   * Example: 8196 for Claude-3.7 Sonnet
   */
  maxCompletionTokens: number;

  cost: {
    input?: { price: number; unit: number };
    output?: { price: number; unit: number };
  };
}

export interface ProviderConfig {
  id: ProviderKey;
  name: string;
  models: ProviderModel[];
  defaultModel: string;
  endpoints: string[];
}
