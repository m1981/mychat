import { z } from 'zod'; // For validation
import { DEFAULT_CHAT_CONFIG } from '@config/chat/ChatConfig';
import { ProviderRegistry } from '@config/providers/provider.registry';
import { capabilityRegistry } from '@capabilities/registry';
import { ChatConfig, ChatConfigUpdate, ModelConfig, ModelConfigUpdate } from '@types/config';
import { ProviderKey } from '@types/chat';
import { FormattedRequest, ProviderResponse, RequestConfig } from '@type/provider';
import { CapabilityContext } from '@type/capability';
import useStore from '@store/store';

// Validation schemas
const thinkingModeSchema = z.object({
  enabled: z.boolean(),
  budget_tokens: z.number().min(100).max(32000)
});

const fileUploadSchema = z.object({
  enabled: z.boolean(),
  maxFiles: z.number().min(1).max(10),
  maxSizePerFile: z.number().min(1).max(100 * 1024 * 1024) // 100MB max
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
    file_upload: fileUploadSchema.optional(),
    // Add other capability schemas
  }).optional()
});

const chatConfigSchema = z.object({
  provider: z.string(),
  modelConfig: modelConfigSchema,
  systemPrompt: z.string().optional()
});

/**
 * Service for managing configuration
 * Acts as a thin wrapper around the store and capability registry
 * Follows the architecture defined in doc_interfaces.md
 */
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
   * Delegates to the capability registry
   */
  isCapabilitySupported(
    capability: string, 
    provider: ProviderKey, 
    model: string
  ): boolean {
    return capabilityRegistry.isCapabilitySupported(capability, provider, model);
  }

  /**
   * Get all capabilities supported by a provider/model
   * Delegates to the capability registry
   */
  getSupportedCapabilities(
    provider: ProviderKey,
    model: string
  ) {
    return capabilityRegistry.getSupportedCapabilities(provider, model);
  }

  /**
   * Get UI components for capabilities
   * Delegates to the capability registry
   */
  getCapabilityComponents(
    provider: ProviderKey,
    model: string,
    modelConfig: ModelConfig,
    setModelConfig: (config: ModelConfig) => void
  ): React.ReactNode[] {
    return capabilityRegistry.getCapabilityComponents(
      provider,
      model,
      modelConfig,
      setModelConfig
    );
  }

  /**
   * Create a capability context object
   * Delegates to the capability registry
   */
  createCapabilityContext(
    provider: ProviderKey,
    model: string,
    modelConfig: ModelConfig
  ): CapabilityContext {
    return capabilityRegistry.createContext(
      provider,
      model,
      modelConfig
    );
  }

  /**
   * Format request for a specific provider
   * Follows the request middleware pipeline defined in doc_interfaces.md
   */
  formatRequest(
    config: ChatConfig,
    messages: any[]
  ): FormattedRequest {
    const { provider, modelConfig } = config;
    
    // 1. Get provider-specific formatter
    const providerImpl = ProviderRegistry.getProviderImplementation(provider);
    
    if (!providerImpl || !providerImpl.formatRequest) {
      throw new Error(`Provider ${provider} not found or doesn't support formatRequest`);
    }
    
    // 2. Create base request config
    const requestConfig: RequestConfig = {
      ...modelConfig,
      stream: modelConfig.capabilities?.streaming?.enabled || false,
      thinking_mode: modelConfig.capabilities?.thinking_mode
    };
    
    // 3. Format the base request
    const baseRequest = providerImpl.formatRequest(requestConfig, messages);
    
    // 4. Create capability context
    const context = this.createCapabilityContext(
      provider,
      modelConfig.model,
      modelConfig
    );
    
    // 5. Apply capability middleware
    return capabilityRegistry.applyRequestMiddleware(baseRequest, context);
  }

  /**
   * Process a provider response through capability middleware
   * Follows the response middleware pipeline defined in doc_interfaces.md
   */
  processResponse(
    response: ProviderResponse, 
    config: ChatConfig
  ): ProviderResponse {
    const { provider, modelConfig } = config;
    
    // 1. Create capability context
    const context = this.createCapabilityContext(
      provider,
      modelConfig.model,
      modelConfig
    );
    
    // 2. Apply capability middleware
    return capabilityRegistry.applyResponseMiddleware(response, context);
  }

  /**
   * Validate a configuration
   * @returns true if valid, throws error if invalid
   */
  validateConfig(config: ChatConfig): boolean {
    try {
      chatConfigSchema.parse(config);
      return true;
    } catch (error) {
      console.error('Invalid configuration:', error);
      throw new Error('Invalid configuration');
    }
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