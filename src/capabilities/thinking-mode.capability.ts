import { CapabilityDefinition, CapabilityContext } from '@type/capability';
import { ProviderKey } from '@type/chat';
import { FormattedRequest, ProviderResponse } from '@type/provider';
import { PROVIDER_CONFIGS } from '@config/providers/provider.config';
import { ThinkingModeToggle } from '@components/ThinkingModeToggle';
import { capabilityRegistry } from './registry';

export const ThinkingModeCapability: CapabilityDefinition = {
  id: 'thinking',
  name: 'Thinking Mode',
  priority: 100, // High priority - show at top
  
  isSupported: (provider: ProviderKey) => 
    PROVIDER_CONFIGS[provider]?.capabilities?.supportsThinking || false,
  
  configComponent: ThinkingModeToggle,
  
  formatRequestMiddleware: (request: FormattedRequest, context: CapabilityContext): FormattedRequest => {
    const { modelConfig } = context;
    
    // Only apply if thinking mode is enabled
    if (!modelConfig.thinking_mode?.enabled) {
      return request;
    }
    
    // Add thinking mode configuration to the request
    return {
      ...request,
      thinking: {
        type: 'enabled',
        budget_tokens: modelConfig.thinking_mode.budget_tokens || 16000
      }
    };
  },
  
  parseResponseMiddleware: (response: ProviderResponse, context: CapabilityContext): ProviderResponse => {
    // Process thinking-specific response data if needed
    return response;
  }
};

// Register the capability
capabilityRegistry.registerCapability(ThinkingModeCapability);
