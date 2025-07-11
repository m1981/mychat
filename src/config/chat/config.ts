import { v4 as uuidv4 } from 'uuid';

import { DEFAULT_PROVIDER, DEFAULT_SYSTEM_MESSAGE, DEFAULT_CHAT_CONFIG } from '../../constants';
import { ModelRegistry } from '../models/registry';
import { ProviderRegistry } from '../providers/registry';
import { ChatInterface } from '../types/chat.types';
import { ModelConfig } from '../types/model.types';

/**
 * Create default model configuration based on provider
 */
export function createDefaultModelConfig(provider = DEFAULT_PROVIDER): ModelConfig {
  const providerCapabilities = ProviderRegistry.getProviderCapabilities(provider);
  const defaultModel = providerCapabilities.defaultModel;
  const modelCapabilities = ModelRegistry.getModelCapabilities(defaultModel);

  return {
    model: defaultModel,
    max_tokens: modelCapabilities.defaultResponseTokens,
    temperature: 0,
    presence_penalty: 0,
    top_p: 1,
    frequency_penalty: 0,
    enableThinking: providerCapabilities.supportsThinking,
    thinkingConfig: {
      budget_tokens: providerCapabilities.defaultThinkingBudget || 0,
    },
  };
}

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