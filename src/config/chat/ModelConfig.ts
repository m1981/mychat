import { ModelRegistry } from '@config/models/model.registry';
import { ProviderRegistry } from '@config/providers/provider.registry';
import { ModelConfig } from '@type/chat';

// Move this from ChatConfig.ts to break circular dependency
const DEFAULT_PROVIDER = 'anthropic' as const;

export function createDefaultModelConfig(): Readonly<ModelConfig> {
  const defaultProvider = ProviderRegistry.getProvider(DEFAULT_PROVIDER);
  const defaultModel = defaultProvider.defaultModel;
  const modelCapabilities = ModelRegistry.getModelCapabilities(defaultModel);

  return Object.freeze({
    model: defaultModel,
    max_tokens: modelCapabilities.defaultResponseTokens,
    temperature: 0,
    presence_penalty: 0,
    top_p: 1,
    frequency_penalty: 0,
    enableThinking: false,
    thinkingConfig: Object.freeze({
      budget_tokens: 1000,
    }),
  });
}

export const DEFAULT_MODEL_CONFIG = createDefaultModelConfig();
