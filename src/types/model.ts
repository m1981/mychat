export interface ModelCapabilities {
  modelId: string;
  provider: string;
  maxResponseTokens: number;
  defaultResponseTokens: number;
  supportsThinking?: boolean;
  defaultThinkingBudget?: number;
}