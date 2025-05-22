import { ProviderKey } from './chat';
import { ModelConfig } from './provider';
import { FormattedRequest, ProviderResponse } from './provider';

/**
 * Configuration for a specific capability
 * Each capability can define its own configuration structure
 */
export interface CapabilityConfig {
  [key: string]: any;
}

/**
 * Context provided to capability middleware
 */
export interface CapabilityContext {
  provider: ProviderKey;
  model: string;
  modelConfig: ModelConfig;
}

/**
 * Definition of a provider capability
 */
export interface CapabilityDefinition {
  /**
   * Unique identifier for the capability
   */
  id: string;
  
  /**
   * Display name of the capability
   */
  name: string;
  
  /**
   * Determines if this capability is supported by a provider/model
   */
  isSupported: (provider: ProviderKey, model: string) => boolean;
  
  /**
   * React component for configuring this capability
   */
  configComponent: React.ComponentType<{
    modelConfig: ModelConfig;
    setModelConfig: (config: ModelConfig) => void;
    context?: CapabilityContext;
  }>;
  
  /**
   * Priority for UI rendering (higher numbers appear first)
   */
  priority?: number;
  
  /**
   * Middleware to modify requests for this capability
   */
  formatRequestMiddleware?: (
    request: FormattedRequest, 
    context: CapabilityContext
  ) => FormattedRequest;
  
  /**
   * Middleware to modify responses for this capability
   */
  parseResponseMiddleware?: (
    response: ProviderResponse, 
    context: CapabilityContext
  ) => ProviderResponse;
  
  /**
   * Optional array of capability IDs that this capability depends on
   */
  dependencies?: string[];
  
  /**
   * Optional initialization method called when the capability is registered
   */
  initialize?: () => void;
  
  /**
   * Optional cleanup method called when the capability is unregistered
   */
  cleanup?: () => void;
}

/**
 * Registry for managing provider capabilities
 */
export interface CapabilityRegistry {
  /**
   * Registers a capability with the registry
   */
  registerCapability: (capability: CapabilityDefinition) => void;
  
  /**
   * Gets all capabilities supported by a provider/model
   */
  getSupportedCapabilities: (
    provider: ProviderKey, 
    model: string
  ) => CapabilityDefinition[];
  
  /**
   * Checks if a specific capability is supported
   */
  isCapabilitySupported: (
    capabilityId: string, 
    provider: ProviderKey, 
    model: string
  ) => boolean;
  
  /**
   * Gets UI components for all supported capabilities
   */
  getCapabilityComponents: (
    provider: ProviderKey, 
    model: string, 
    modelConfig: ModelConfig, 
    setModelConfig: (config: ModelConfig) => void
  ) => React.ReactNode[];
  
  /**
   * Applies all capability middleware to a request
   */
  applyRequestMiddleware: (
    request: FormattedRequest, 
    context: CapabilityContext
  ) => FormattedRequest;
  
  /**
   * Applies all capability middleware to a response
   */
  applyResponseMiddleware: (
    response: ProviderResponse, 
    context: CapabilityContext
  ) => ProviderResponse;
}