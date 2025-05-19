import { ModelRegistry } from '@config/models/model.registry';
import { ProviderRegistry } from '@config/providers/provider.registry';
import { ModelConfig } from '@type/chat';

// Move this from ChatConfig.ts to break circular dependency
export const DEFAULT_PROVIDER = 'anthropic' as const;

export function createDefaultModelConfig(): Readonly<ModelConfig> {
  try {
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
  } catch (error) {
    // Fallback for tests or when registry is not available
    console.warn('Using fallback model config:', error);
    return Object.freeze({
      model: 'claude-3-7-sonnet-20250219',
      max_tokens: 4096,
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
}

// Create the default config once and export it
export const DEFAULT_MODEL_CONFIG = createDefaultModelConfig();
