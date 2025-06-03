/**
 * Configuration Service
 * 
 * This service provides a centralized way to access and modify
 * application configuration.
 */

import { v4 as uuidv4 } from 'uuid';

import { 
  DEFAULT_SYSTEM_MESSAGE
} from '../constants';
import { ModelRegistry, ProviderRegistry } from '../registry';
import { 
  ChatConfig, 
  ModelConfig, 
  ProviderKey,
  ChatInterface
} from '../types';


export class ConfigService {
  /**
   * Creates a default model configuration
   */
  static createDefaultModelConfig(provider?: ProviderKey): ModelConfig {
    const targetProvider = provider || 'anthropic';
    const defaultModel = ProviderRegistry.getDefaultModelForProvider(targetProvider);
    const capabilities = ModelRegistry.getModelCapabilities(defaultModel);
    
    return {
      model: defaultModel,
      max_tokens: capabilities.defaultResponseTokens,
      temperature: 0.7,
      top_p: 1,
      presence_penalty: 0,
      frequency_penalty: 0,
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
      provider: provider || 'anthropic',
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


}