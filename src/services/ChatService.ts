import { ProviderRegistry } from '@config/providers/provider.registry';
import { ProviderKey, RequestConfig } from '@type/provider';
import { MessageInterface } from '@type/chat';

export class ChatService {
  async submitChat(messages: MessageInterface[], config: RequestConfig, providerKey?: ProviderKey) {
    // Get provider from registry instead of direct import
    const provider = ProviderRegistry.getProviderImplementation(providerKey);
    
    // Format request using provider
    const formattedRequest = provider.formatRequest(messages, config);
    
    // Submit request
    const response = await provider.submitCompletion(formattedRequest);
    
    // Parse response
    return provider.parseResponse(response);
  }
  
  async streamChat(messages: MessageInterface[], config: RequestConfig, providerKey?: ProviderKey) {
    // Get provider from registry
    const provider = ProviderRegistry.getProviderImplementation(providerKey);
    
    // Format request
    const formattedRequest = provider.formatRequest(messages, {
      ...config,
      stream: true
    });
    
    // Submit streaming request
    return await provider.submitStream(formattedRequest);
  }
}