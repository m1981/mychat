import { CapabilityDefinition, CapabilityRegistry, CapabilityContext } from '@type/capability';
import { ProviderKey } from '@type/chat';
import { ModelConfig, FormattedRequest, ProviderResponse } from '@type/provider';
import React from 'react';

/**
 * Implementation of the CapabilityRegistry interface
 */
class CapabilityRegistryImpl implements CapabilityRegistry {
  private capabilities: CapabilityDefinition[] = [];
  
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
  applyRequestMiddleware(
    request: FormattedRequest, 
    context: CapabilityContext
  ): FormattedRequest {
    const { provider, model } = context;
    const supportedCapabilities = this.getSupportedCapabilities(provider, model);
    
    // Apply middleware from each supported capability
    return supportedCapabilities.reduce(
      (modifiedRequest, capability) => {
        if (capability.formatRequestMiddleware) {
          try {
            return capability.formatRequestMiddleware(modifiedRequest, context);
          } catch (error) {
            console.error(`Error in ${capability.id} request middleware:`, error);
            // Return unmodified request on error
            return modifiedRequest;
          }
        }
        return modifiedRequest;
      }, 
      request
    );
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