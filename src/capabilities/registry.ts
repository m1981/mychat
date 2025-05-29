import { CapabilityDefinition, CapabilityContext } from '@type/capability';
import { FormattedRequest, ProviderResponse } from '@type/provider';
import { ProviderKey } from '@type/chat';
import { ModelRegistry } from '@config/models/model.registry';
import { ProviderRegistry } from '@config/providers/provider.registry';

export class CapabilityRegistryImpl implements CapabilityRegistry {
  private static instance: CapabilityRegistryImpl;
  private capabilities: CapabilityDefinition[] = [];

  private constructor() {}

  static getInstance(): CapabilityRegistryImpl {
    if (!this.instance) {
      this.instance = new CapabilityRegistryImpl();
    }
    return this.instance;
  }

  createContext(provider: ProviderKey, model: string, modelConfig: ModelConfig): CapabilityContext {
    return { provider, model, modelConfig };
  }
  
  /**
   * Registers a capability with the registry
   */
  registerCapability(capability: CapabilityDefinition): void {
    this.capabilities.push(capability);
    
    // Sort capabilities by priority (highest first)
    this.capabilities.sort((a, b) => 
      (b.priority || 0) - (a.priority || 0)
    );
  }
  
  /**
   * Gets all capabilities supported by a provider/model
   */
  getSupportedCapabilities(
    provider: ProviderKey, 
    model: string
  ): CapabilityDefinition[] {
    return this.capabilities.filter(capability => 
      capability.isSupported(provider, model)
    );
  }
  
  /**
   * Checks if a specific capability is supported
   */
  isCapabilitySupported(
    capabilityId: string, 
    provider: ProviderKey, 
    model: string
  ): boolean {
    const capability = this.capabilities.find(c => c.id === capabilityId);
    if (!capability) return false;
    
    return capability.isSupported(provider, model);
  }
  
  /**
   * Unified method to check if a provider/model supports a specific capability type
   * This centralizes all capability checks through the registry
   */
  hasCapability(
    capabilityType: string,
    provider: ProviderKey,
    model: string
  ): boolean {
    // First check provider-level capabilities
    const providerCapabilities = ProviderRegistry.getProviderCapabilities(provider);
    
    // Then check model-specific capabilities
    const modelCapabilities = ModelRegistry.getModelCapabilities(model);
    
    // Map capability types to their respective checks
    switch (capabilityType) {
      case 'thinking':
        return providerCapabilities.supportsThinking && 
               (modelCapabilities.supportsThinking || false);
      case 'streaming':
        return providerCapabilities.supportsStreaming || false;
      case 'systemPrompt':
        return modelCapabilities.supportsSystemPrompt || false;
      default:
        // For registered capabilities, use the registry
        return this.isCapabilitySupported(capabilityType, provider, model);
    }
  }
  
  applyRequestMiddleware(
    request: FormattedRequest, 
    context: CapabilityContext
  ): FormattedRequest {
    const { provider, model } = context;
    const supportedCapabilities = this.getSupportedCapabilities(provider, model);
    
    return supportedCapabilities.reduce(
      (req, capability) => 
        capability.formatRequestMiddleware ? 
          capability.formatRequestMiddleware(req, context) : 
          req,
      request
    );
  }
  
  applyResponseMiddleware(
    response: ProviderResponse,
    context: CapabilityContext
  ): ProviderResponse {
    const { provider, model } = context;
    const supportedCapabilities = this.getSupportedCapabilities(provider, model);
    
    return supportedCapabilities.reduce(
      (res, capability) => 
        capability.parseResponseMiddleware ? 
          capability.parseResponseMiddleware(res, context) : 
          res,
      response
    );
  }
}

// Singleton instance
export const capabilityRegistry = CapabilityRegistryImpl.getInstance();

/**
 * Helper function to create a capability context
 */
export function createCapabilityContext(
  provider: ProviderKey,
  model: string,
  modelConfig: any
): CapabilityContext {
  return {
    provider,
    model,
    modelConfig
  };
}