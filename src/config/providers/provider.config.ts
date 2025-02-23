// src/config/providers/provider.config.ts

import { ProviderKey } from '@type/chat';

export interface ProviderModel {
  id: string;
  name: string;
  maxTokens: number;
  cost: {
    input?: { price: number; unit: number };
    output?: { price: number; unit: number };
    price?: number;  // Legacy support
    unit?: number;   // Legacy support
  };
}

export interface ProviderConfig {
  id: ProviderKey;
  name: string;
  models: ProviderModel[];
  defaultModel: string;
  endpoints: string[];
}
