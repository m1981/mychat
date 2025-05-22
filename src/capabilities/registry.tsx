import { CapabilityDefinition, CapabilityRegistry, CapabilityContext } from '@type/capability';
import { ProviderKey } from '@type/chat';
import { ModelConfig, FormattedRequest, ProviderResponse } from '@type/provider';
import React from 'react';

/**
 * Implementation of the CapabilityRegistry interface
 */
class CapabilityRegistryImpl implements CapabilityRegistry {
  private capabilities: CapabilityDefinition[] = [];
  private middlewareCache: Map<string, Array<(request: FormattedRequest, context: CapabilityContext) => FormattedRequest>> = new Map();
  
  /**
   * Registers a capability with the registry
   */
  registerCapability(capability: CapabilityDefinition): void {
    this.capabilities.push(capability);
    
    // Sort capabilities by priority (highest first)
    this.capabilities.sort((a, b) => 
      (b.priority || 0) - (a.priority || 0)
    );
    
    // Clear cache when registering new capabilities
    this.middlewareCache.clear();
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
   * Gets UI components for all supported capabilities
   */
  getCapabilityComponents(
    provider: ProviderKey, 
    model: string, 
    modelConfig: ModelConfig, 
    setModelConfig: (config: ModelConfig) => void
  ): React.ReactNode[] {
    const supportedCapabilities = this.getSupportedCapabilities(provider, model);
    
    return supportedCapabilities.map(capability => {
      const Component = capability.configComponent;
      const context: CapabilityContext = {
        provider,
        model,
        modelConfig
      };
      
      return (
        <div key={capability.id} className="capability-container">
          <Component 
            modelConfig={modelConfig} 
            setModelConfig={setModelConfig} 
            context={context} 
          />
        </div>
      );
    });
  }
  
  /**
   * Applies all capability middleware to a request with error handling
   */
  applyRequestMiddleware(request: FormattedRequest, context: CapabilityContext): FormattedRequest {
    const cacheKey = `${context.provider}:${context.model}`;
    
    // Get or create middleware chain
    let middlewareChain = this.middlewareCache.get(cacheKey);
    if (!middlewareChain) {
      middlewareChain = this.buildMiddlewareChain(context.provider, context.model);
      this.middlewareCache.set(cacheKey, middlewareChain);
    }
    
    // Apply middleware chain
    return middlewareChain.reduce(
      (req, middleware) => {
        try {
          return middleware(req, context);
        } catch (error) {
          console.error(`Error in middleware:`, error);
          return req;
        }
      },
      request
    );
  }
  
  // Build middleware chain (called only when needed)
  private buildMiddlewareChain(provider: ProviderKey, model: string): Array<(request: FormattedRequest, context: CapabilityContext) => FormattedRequest> {
    return this.getSupportedCapabilities(provider, model)
      .filter(cap => !!cap.formatRequestMiddleware)
      .sort((a, b) => (b.priority || 0) - (a.priority || 0))
      .map(cap => cap.formatRequestMiddleware!);
  }
  
  /**
   * Applies all capability middleware to a response
   */
  applyResponseMiddleware(
    response: ProviderResponse, 
    context: CapabilityContext
  ): ProviderResponse {
    const { provider, model } = context;
    const supportedCapabilities = this.getSupportedCapabilities(provider, model);
    
    // Apply middleware from each supported capability
    return supportedCapabilities.reduce(
      (modifiedResponse, capability) => {
        if (capability.parseResponseMiddleware) {
          return capability.parseResponseMiddleware(modifiedResponse, context);
        }
        return modifiedResponse;
      }, 
      response
    );
  }
}

// Create singleton instance
export const capabilityRegistry = new CapabilityRegistryImpl();

// Export a function to create context objects
export function createCapabilityContext(
  provider: ProviderKey,
  model: string,
  modelConfig: ModelConfig
): CapabilityContext {
  return {
    provider,
    model,
    modelConfig
  };
}

// Consider adding a hook like this to match the spec:
export function useCapability(capabilityId: string, chatId?: string) {
  // Get current chat ID if not provided
  const currentChatId = useStore(state => {
    if (chatId) return chatId;
    const { chats, currentChatIndex } = state;
    return chats[currentChatIndex]?.id;
  });
  
  // Get chat config
  const chatConfig = useStore(state => state.getChatConfig(currentChatId));
  
  // Check if capability is enabled
  const isEnabled = useCallback(() => {
    return !!chatConfig.modelConfig.capabilities?.[capabilityId]?.enabled;
  }, [chatConfig, capabilityId]);
  
  // Toggle capability
  const toggleCapability = useCallback((enabled: boolean) => {
    useStore.getState().updateCapabilityConfig(currentChatId, capabilityId, { enabled });
  }, [currentChatId, capabilityId]);
  
  return {
    isEnabled: isEnabled(),
    toggleCapability
  };
}