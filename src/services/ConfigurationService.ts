import { CapabilityRegistry } from '@config/capabilities/registry';
import { ProviderRegistry } from '@config/providers/provider.registry';
import { ChatConfig, ChatConfigUpdate, ModelConfig } from '@config/types';
import { CapabilityContext } from '@type/capability';
import { ProviderKey } from '@type/chat';
import { FormattedRequest } from '@type/provider';
import useStore from '@store/store';

/**
 * Service for managing configuration throughout the application
 */
export class ConfigurationService {
  constructor(
    private store = useStore,
    private capabilityRegistry = CapabilityRegistry.getInstance()
  ) {}

  /**
   * Get global default configuration
   */
  getDefaultConfig(): ChatConfig {
    return this.store.getState().defaultChatConfig;
  }

  /**
   * Update global default configuration
   * @param update - Partial configuration update
   */
  updateDefaultConfig(update: ChatConfigUpdate): void {
    // Validate update before applying
    const validatedUpdate = this.validateConfigUpdate(update);
    this.store.getState().updateDefaultChatConfig(validatedUpdate);
  }

  /**
   * Get configuration for a specific chat
   * @param chatId - ID of the chat
   */
  getChatConfig(chatId: string): ChatConfig {
    return this.store.getState().getChatConfig(chatId);
  }

  /**
   * Update configuration for a specific chat
   * @param chatId - ID of the chat
   * @param update - Partial configuration update
   */
  updateChatConfig(chatId: string, update: ChatConfigUpdate): void {
    // Get current config to determine provider/model for validation
    const currentConfig = this.getChatConfig(chatId);
    
    // Validate update before applying
    const validatedUpdate = this.validateConfigUpdate(
      update,
      update.provider || currentConfig.provider,
      update.modelConfig?.model || currentConfig.modelConfig.model
    );
    
    this.store.getState().updateChatConfig(chatId, validatedUpdate);
  }

  /**
   * Check if a capability is supported for a provider/model
   * @param capability - Capability ID
   * @param provider - Provider key
   * @param model - Model ID
   */
  isCapabilitySupported(
    capability: string,
    provider: ProviderKey,
    model: string
  ): boolean {
    return this.capabilityRegistry.isCapabilitySupported(
      capability,
      provider,
      model
    );
  }

  /**
   * Check if a capability is enabled for a specific chat
   * @param chatId - ID of the chat
   * @param capability - Capability ID
   */
  isCapabilityEnabled(chatId: string, capability: string): boolean {
    return this.store.getState().isCapabilityEnabled(chatId, capability);
  }

  /**
   * Update a specific capability's configuration for a chat
   * @param chatId - ID of the chat
   * @param capability - Capability ID
   * @param config - New capability configuration
   */
  updateCapabilityConfig(chatId: string, capability: string, config: any): void {
    // Get current config to determine provider/model for validation
    const currentConfig = this.getChatConfig(chatId);
    
    // Check if capability is supported
    if (!this.isCapabilitySupported(
      capability,
      currentConfig.provider,
      currentConfig.modelConfig.model
    )) {
      throw new Error(
        `Capability ${capability} is not supported by ${currentConfig.provider}/${currentConfig.modelConfig.model}`
      );
    }
    
    // Update capability config
    this.store.getState().updateCapabilityConfig(chatId, capability, config);
  }

  /**
   * Format configuration for a specific provider
   * @param config - Chat configuration
   * @returns Formatted request with applied middleware
   */
  formatForProvider(config: ChatConfig): FormattedRequest {
    // Get provider implementation
    const provider = ProviderRegistry.getProvider(config.provider);
    
    // Create base request
    const baseRequest = provider.formatRequest([], config.modelConfig);
    
    // Apply capability middleware
    const context: CapabilityContext = {
      provider: config.provider,
      model: config.modelConfig.model,
      modelConfig: config.modelConfig
    };
    
    return this.capabilityRegistry.applyRequestMiddleware(baseRequest, context);
  }

  /**
   * Validate configuration update
   * @param update - Configuration update to validate
   * @param provider - Provider key for validation context
   * @param model - Model ID for validation context
   * @returns Validated configuration update
   * @private
   */
  private validateConfigUpdate(
    update: ChatConfigUpdate,
    provider?: ProviderKey,
    model?: string
  ): ChatConfigUpdate {
    // Clone update to avoid modifying the original
    const validatedUpdate = { ...update };
    
    // Validate model config if present
    if (validatedUpdate.modelConfig) {
      // Validate model if present
      if (validatedUpdate.modelConfig.model && provider) {
        const providerImpl = ProviderRegistry.getProvider(provider);
        
        // Check if model is supported by provider
        if (!providerImpl.models.includes(validatedUpdate.modelConfig.model)) {
          throw new Error(
            `Model ${validatedUpdate.modelConfig.model} is not supported by provider ${provider}`
          );
        }
      }
      
      // Validate capabilities if present
      if (validatedUpdate.modelConfig.capabilities && provider && model) {
        Object.keys(validatedUpdate.modelConfig.capabilities).forEach(capabilityId => {
          if (!this.isCapabilitySupported(capabilityId, provider, model)) {
            throw new Error(
              `Capability ${capabilityId} is not supported by ${provider}/${model}`
            );
          }
        });
      }
      
      // Validate numeric parameters
      if (validatedUpdate.modelConfig.temperature !== undefined) {
        validatedUpdate.modelConfig.temperature = Math.max(0, Math.min(1, validatedUpdate.modelConfig.temperature));
      }
      
      if (validatedUpdate.modelConfig.max_tokens !== undefined) {
        validatedUpdate.modelConfig.max_tokens = Math.max(1, validatedUpdate.modelConfig.max_tokens);
      }
    }
    
    return validatedUpdate;
  }
}

// Singleton instance for easy access
export const configurationService = new ConfigurationService();

// Hook for accessing the configuration service
export function useConfigurationService() {
  return configurationService;
}