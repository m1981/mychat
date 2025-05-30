/**
 * Configuration Service
 * 
 * This service provides a centralized way to access and modify
 * application configuration.
 */

import { 
  ChatConfig, 
  ModelConfig, 
  ProviderKey,
  ChatInterface
} from '../types';
import { 
  DEFAULT_MODEL_CONFIG, 
  DEFAULT_PROVIDER,
  DEFAULT_SYSTEM_MESSAGE
} from '../constants';
import { ModelRegistry, ProviderRegistry } from '../registry';
import { v4 as uuidv4 } from 'uuid';

export class ConfigService {
  /**
   * Creates a default model configuration
   */
  static createDefaultModelConfig(provider?: ProviderKey): ModelConfig {
    const targetProvider = provider || DEFAULT_PROVIDER;
    const defaultModel = ProviderRegistry.getDefaultModelForProvider(targetProvider);
    const capabilities = ModelRegistry.getModelCapabilities(defaultModel);
    
    return {
      ...DEFAULT_MODEL_CONFIG,
      model: defaultModel,
      max_tokens: capabilities.defaultResponseTokens,
      enableThinking: capabilities.supportsThinking || false,
      thinkingConfig: {
        budget_tokens: capabilities.supportsThinking ? 
          (capabilities.defaultThinkingBudget || 1000) : 0
      }
    };
  }

  /**
   * Creates a default chat configuration
   */
  static createDefaultChatConfig(provider?: ProviderKey): ChatConfig {
    return {
      provider: provider || DEFAULT_PROVIDER,
      modelConfig: this.createDefaultModelConfig(provider)
    };
  }

  /**
   * Creates a new empty chat
   */
  static createNewChat(config?: ChatConfig): ChatInterface {
    const chatConfig = config || this.createDefaultChatConfig();
    
    return {
      id: uuidv4(),
      title: 'New Chat',
      messages: [{
        role: 'system',
        content: DEFAULT_SYSTEM_MESSAGE,
        id: uuidv4()
      }],
      config: chatConfig,
      titleSet: false,
      timestamp: Date.now()
    };
  }

  /**
   * Validates a model configuration
   */
  static validateModelConfig(
    modelConfig: ModelConfig, 
    provider: ProviderKey
  ): ModelConfig {
    const capabilities = ProviderRegistry.getProviderCapabilities(provider);
    const validModel = ProviderRegistry.validateModelForProvider(
      provider, 
      modelConfig.model
    );
    
    // If model is invalid for provider, use default
    const model = validModel ? 
      modelConfig.model : 
      ProviderRegistry.getDefaultModelForProvider(provider);
    
    // Ensure thinking is only enabled if supported
    const enableThinking = capabilities.supportsThinking ? 
      !!modelConfig.enableThinking : 
      false;
    
    // Set appropriate budget tokens
    const budgetTokens = enableThinking ?
      (modelConfig.thinkingConfig?.budget_tokens || 
       capabilities.defaultThinkingBudget || 
       1000) : 0;
    
    return {
      ...modelConfig,
      model,
      enableThinking,
      thinkingConfig: { budget_tokens: budgetTokens }
    };
  }
}