export type ProviderKey = 'anthropic' | 'openai' | string;

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

export interface ProviderCapabilities {
  supportsThinking: boolean;
  defaultThinkingModel?: string;
  maxCompletionTokens: number;
  defaultModel: string;
}