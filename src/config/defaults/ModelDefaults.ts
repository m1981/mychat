import { ModelConfig } from '../chat/ModelConfig';
import { ModelRegistry } from '../models/model.registry';
import { ProviderRegistry } from '../providers/provider.registry';
import { DEFAULT_TOKEN_CONFIG } from '../tokens/TokenConfig';

export const createDefaultModelConfig = (providerId: string, modelId: string): ModelConfig => {
  const modelCapabilities = ModelRegistry.getModelCapabilities(modelId);
  
  return {
    provider: providerId,
    model: modelId,
    max_tokens: modelCapabilities.defaultResponseTokens,
    temperature: 0.7,
    top_p: 1,
    presence_penalty: 0,
    frequency_penalty: 0,
    enableThinking: false,
    thinkingConfig: {
      budget_tokens: DEFAULT_TOKEN_CONFIG.thinking.budget_tokens,
    }
  };
};