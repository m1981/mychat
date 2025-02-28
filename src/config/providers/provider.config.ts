// src/config/providers/provider.config.ts

import { ProviderKey } from '@type/chat';

export interface ProviderModel {
  id: string;
  name: string;
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
