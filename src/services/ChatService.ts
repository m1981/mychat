import { ProviderRegistry } from '@config/providers/provider.registry';
import { ProviderKey, RequestConfig } from '@type/provider';
import { MessageInterface } from '@type/chat';

export class ChatService {
  async submitChat(messages: MessageInterface[], config: RequestConfig, providerKey?: ProviderKey) {
    // Get provider from registry
    const provider = ProviderRegistry.getProvider(providerKey);
    
    // Format request using provider
    const formattedRequest = provider.formatRequest(messages, config);
    
    const response = await provider.submitCompletion(formattedRequest);
    
    return provider.parseResponse(response);
  }
  
  async streamChat(messages: MessageInterface[], config: RequestConfig, providerKey?: ProviderKey) {
    // Get provider from registry
    const provider = ProviderRegistry.getProvider(providerKey);
    
    const formattedRequest = provider.formatRequest(messages, {
      ...config,
      stream: true
    });
    
    return await provider.submitStream(formattedRequest);
  }
}