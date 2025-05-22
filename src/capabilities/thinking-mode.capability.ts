import { CapabilityDefinition } from '@config/capabilities/types';
import { FormattedRequest } from '@type/provider';
import { CapabilityContext } from '@type/capability';
import ThinkingModeToggle from '@components/ThinkingModeToggle';

/**
 * Thinking Mode capability definition
 * 
 * This capability allows the AI to "think" before responding,
 * which can improve the quality of responses for complex tasks.
 */
export const ThinkingModeCapability: CapabilityDefinition = {
  id: 'thinking_mode',
  name: 'Thinking Mode',
  description: 'Allows the AI to think before responding',
  configComponent: ThinkingModeToggle,
  priority: 10,
  
  isSupported: (provider, model) => {
    // Currently only supported by Anthropic models
    return provider === 'anthropic' && model.includes('claude');
  },
  
  formatRequestMiddleware: (request: FormattedRequest, context: CapabilityContext): FormattedRequest => {
    const { modelConfig } = context;
    
    // Only apply if thinking mode is enabled
    if (!modelConfig.capabilities?.thinking_mode?.enabled) {
      return request;
    }
    
    // Add thinking mode configuration to request
    return {
      ...request,
      thinking: {
        type: 'enabled',
        budget_tokens: modelConfig.capabilities.thinking_mode.budget_tokens || 16000
      }
    };
  },
  
  parseResponseMiddleware: (response, context) => {
    // Process thinking mode response if needed
    return response;
  }
};