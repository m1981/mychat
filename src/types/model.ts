export interface ModelCapabilities {
  modelId: string;
  provider: string;
  contextWindow: number;
  maxResponseTokens: number;
  defaultResponseTokens: number;
  supportsThinking?: boolean;
  defaultThinkingBudget?: number;
}