import { ChatConfig, ChatInterface } from '../types/chat.types';
import { ModelConfig } from '../types/model.types';
import { DEFAULT_PROVIDER, DEFAULT_SYSTEM_MESSAGE } from '../constants';
import { ProviderRegistry } from '../providers/registry';
import { ModelRegistry } from '../models/registry';
import { v4 as uuidv4 } from 'uuid';

/**
 * Create default model configuration based on provider
 */
export function createDefaultModelConfig(provider = DEFAULT_PROVIDER): ModelConfig {
  const defaultProvider = ProviderRegistry.getProvider(provider);
  const defaultModel = defaultProvider.defaultModel;
  const modelCapabilities = ModelRegistry.getModelCapabilities(defaultModel);

  return {
    model: defaultModel,
    max_tokens: modelCapabilities.defaultResponseTokens,
    temperature: 0,
    presence_penalty: 0,
    top_p: 1,
    frequency_penalty: 0,
    enableThinking: false,
    thinkingConfig: {
      budget_tokens: modelCapabilities.defaultThinkingBudget || 1000,
    },
  };
}

/**
 * Default chat configuration
 */
export const DEFAULT_MODEL_CONFIG = createDefaultModelConfig();

export const DEFAULT_CHAT_CONFIG: ChatConfig = {
  provider: DEFAULT_PROVIDER,
  modelConfig: DEFAULT_MODEL_CONFIG,
};

/**
 * Generate a default chat with specified title and folder
 */
export function generateDefaultChat(
  title: string, 
  folder?: string, 
  systemMessage = DEFAULT_SYSTEM_MESSAGE
): ChatInterface {
  return {
    id: uuidv4(),
    title,
    folder,
    messages: [
      {
        role: 'system',
        content: systemMessage
      }
    ],
    config: DEFAULT_CHAT_CONFIG,
    titleSet: true,
    timestamp: Date.now()
  };
}