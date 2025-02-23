// src/config/providers/provider.config.ts

import { ProviderKey } from '@type/chat';

export interface ProviderModel {
  id: string;
  name: string;
  maxTokens: number;
  cost: {
    price: number;
    unit: number;
  };
}

export interface ProviderConfig {
  id: ProviderKey;
  name: string;
  models: ProviderModel[];
  defaultModel: string;
  endpoints: string[];
}
