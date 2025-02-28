import { ModelConfig } from '@type/chat';
import { ProviderRegistry } from '@config/providers/provider.registry';
import { ModelRegistry } from '@config/models/model.registry';
import { DEFAULT_PROVIDER } from './ChatDefaults';

export const createDefaultModelConfig = (): Readonly<ModelConfig> => {
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
};