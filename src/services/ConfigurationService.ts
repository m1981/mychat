import { z } from 'zod'; // For validation
import { DEFAULT_CHAT_CONFIG } from '@config/chat/ChatConfig';
import { ProviderRegistry } from '@config/providers/provider.registry';
import { ChatConfig, ModelConfig, ChatConfigUpdate, ModelConfigUpdate } from '@config/types';
import { ProviderKey } from '@type/chat';
import useStore from '@store/store';

// Validation schemas
const thinkingModeSchema = z.object({
  enabled: z.boolean(),
  budget_tokens: z.number().min(100).max(32000)
});

const modelConfigSchema = z.object({
  model: z.string(),
  max_tokens: z.number().min(1).max(32000),
  temperature: z.number().min(0).max(2),
  top_p: z.number().min(0).max(1),
  presence_penalty: z.number().min(-2).max(2),
  frequency_penalty: z.number().min(-2).max(2),
  capabilities: z.object({
    thinking_mode: thinkingModeSchema.optional(),
    // Add other capability schemas
  }).optional()
});

const chatConfigSchema = z.object({
  provider: z.string(),
  modelConfig: modelConfigSchema,
  systemPrompt: z.string()
});

export class ConfigurationService {
  /**
   * Get global default configuration
   */
  getDefaultConfig(): ChatConfig {
    return useStore.getState().defaultChatConfig || DEFAULT_CHAT_CONFIG;
  }

  /**
   * Update global default configuration
   */
  updateDefaultConfig(update: ChatConfigUpdate): void {
    const currentConfig = this.getDefaultConfig();
    const newConfig = this.mergeConfigs(currentConfig, update);
    
    // Validate before saving
    try {
      chatConfigSchema.parse(newConfig);
      useStore.getState().setDefaultChatConfig(newConfig);
    } catch (error) {
      console.error('Invalid configuration:', error);
      throw new Error('Invalid configuration');
    }
  }

  /**
   * Get configuration for a specific chat
   */
  getChatConfig(chatId: string): ChatConfig {
    const { chats } = useStore.getState();
    const chat = chats.find(c => c.id === chatId);
    
    if (!chat) {
      throw new Error(`Chat with ID ${chatId} not found`);
    }
    
    return chat.config;
  }

  /**
   * Update configuration for a specific chat
   */
  updateChatConfig(chatId: string, update: ChatConfigUpdate): void {
    const { chats, updateChat } = useStore.getState();
    const chatIndex = chats.findIndex(c => c.id === chatId);
    
    if (chatIndex === -1) {
      throw new Error(`Chat with ID ${chatId} not found`);
    }
    
    const currentConfig = chats[chatIndex].config;
    const newConfig = this.mergeConfigs(currentConfig, update);
    
    // Validate before saving
    try {
      chatConfigSchema.parse(newConfig);
      updateChat(chatIndex, { config: newConfig });
    } catch (error) {
      console.error('Invalid configuration:', error);
      throw new Error('Invalid configuration');
    }
  }

  /**
   * Check if a capability is supported for a provider/model
   */
  isCapabilitySupported(
    capability: string, 
    provider: ProviderKey, 
    model: string
  ): boolean {
    const providerConfig = ProviderRegistry.getProvider(provider);
    
    // Check provider-level capabilities
    if (!providerConfig.capabilities) {
      return false;
    }
    
    // For model-specific capabilities, we could extend this
    return !!providerConfig.capabilities[capability];
  }

  /**
   * Format configuration for a specific provider
   */
  formatForProvider(config: ChatConfig): any {
    const { provider, modelConfig } = config;
    
    // Get provider-specific formatter
    const providerImpl = ProviderRegistry.getProviderImplementation(provider);
    
    if (!providerImpl || !providerImpl.formatRequest) {
      throw new Error(`Provider ${provider} not found or doesn't support formatRequest`);
    }
    
    // Convert to provider-specific format
    return providerImpl.formatRequest([], {
      ...modelConfig,
      // Map capabilities to provider-specific format
      thinking_mode: modelConfig.capabilities?.thinking_mode
    });
  }

  /**
   * Merge configurations (deep merge)
   */
  private mergeConfigs<T>(current: T, update: Partial<T>): T {
    if (!update) return current;
    
    const result = { ...current };
    
    Object.keys(update).forEach(key => {
      const currentValue = current[key];
      const updateValue = update[key];
      
      // If both values are objects, merge them recursively
      if (
        typeof currentValue === 'object' && 
        currentValue !== null &&
        typeof updateValue === 'object' && 
        updateValue !== null &&
        !Array.isArray(currentValue) &&
        !Array.isArray(updateValue)
      ) {
        result[key] = this.mergeConfigs(currentValue, updateValue);
      } else if (updateValue !== undefined) {
        // Otherwise, use the update value
        result[key] = updateValue;
      }
    });
    
    return result;
  }
}

// Export singleton instance
export const configService = new ConfigurationService();