import { CapabilityDefinition, CapabilityContext } from '@type/capability';
import { ProviderKey } from '@type/chat';
import { ModelConfig, FormattedRequest, ProviderResponse } from '@type/provider';
import React from 'react';
import * as Sentry from '@sentry/react';

/**
 * Implementation of the CapabilityRegistry interface
 */
class CapabilityRegistryImpl {
  private capabilities: CapabilityDefinition[] = [];
  private static instance: CapabilityRegistryImpl;
  
  /**
   * Get singleton instance
   */
  public static getInstance(): CapabilityRegistryImpl {
    if (!CapabilityRegistryImpl.instance) {
      CapabilityRegistryImpl.instance = new CapabilityRegistryImpl();
    }
    return CapabilityRegistryImpl.instance;
  }
  
  /**
   * Private constructor for singleton
   */
  private constructor() {}
  
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
            Sentry.withScope((scope) => {
              scope.setTag('capability', capability.id);
              scope.setTag('operation', 'request-middleware');
              scope.setContext('request', { 
                provider, 
                model,
                requestSample: JSON.stringify(modifiedRequest).substring(0, 500) 
              });
              Sentry.captureException(error);
            });
            console.error(`Error in ${capability.id} request middleware:`, error);
            return modifiedRequest;
          }
        }
        return modifiedRequest;
      }, 
      request
    );
  }
  
  /**
   * Applies all capability middleware to a response with error handling
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
          try {
            return capability.parseResponseMiddleware(modifiedResponse, context);
          } catch (error) {
            Sentry.withScope((scope) => {
              scope.setTag('capability', capability.id);
              scope.setTag('operation', 'response-middleware');
              scope.setContext('response', { 
                provider, 
                model,
                responseSample: typeof modifiedResponse === 'string' 
                  ? modifiedResponse.substring(0, 500)
                  : JSON.stringify(modifiedResponse).substring(0, 500)
              });
              Sentry.captureException(error);
            });
            console.error(`Error in ${capability.id} response middleware:`, error);
            return modifiedResponse;
          }
        }
        return modifiedResponse;
      }, 
      response
    );
  }
  
  /**
   * Creates a capability context object
   */
  createContext(
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
}

// Export singleton instance
export const capabilityRegistry = CapabilityRegistryImpl.getInstance();
