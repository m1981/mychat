import Anthropic from '@anthropic-ai/sdk';
import { FormattedRequest, ProviderResponse } from '../../types/provider';
import { ProviderClientAdapter } from './provider-client-adapter';

/**
 * Adapter for Anthropic API client
 * Handles direct SDK interaction in both server and client environments
 */
export class AnthropicClientAdapter implements ProviderClientAdapter {
  private client: Anthropic;
  private requestId: string;
  
  constructor(apiKey: string, requestId?: string) {
    this.client = new Anthropic({ apiKey });
    this.requestId = requestId || Date.now().toString(36);
  }
  
  /**
   * Create a completion with streaming
   */
  async createStreamingCompletion(formattedRequest: FormattedRequest): Promise<any> {
    try {
      console.debug('[AnthropicClientAdapter] Creating streaming completion with request:', 
        JSON.stringify({
          model: formattedRequest.model,
          messageCount: formattedRequest.messages?.length,
          hasSystemInMessages: formattedRequest.messages?.some(m => m.role === 'system'),
          hasSystemProperty: !!formattedRequest.system
        }));
      
      // Convert the request format to Anthropic-specific format
      const anthropicRequest = this.adaptRequestFormat(formattedRequest);
      
      console.debug('[AnthropicClientAdapter] Adapted request format:', 
        JSON.stringify({
          model: anthropicRequest.model,
          messageCount: anthropicRequest.messages?.length,
          systemPrompt: anthropicRequest.system ? 'present' : 'missing'
        }));
      
      // Log the exact payload being sent to Anthropic
      console.debug('[AnthropicClientAdapter] Sending payload to Anthropic:', 
        JSON.stringify({
          model: anthropicRequest.model,
          max_tokens: anthropicRequest.max_tokens,
          temperature: anthropicRequest.temperature,
          top_p: anthropicRequest.top_p,
          messages: anthropicRequest.messages,
          system: anthropicRequest.system,
          stream: true
        }));
      
      // Return the stream directly from the Anthropic SDK
      const stream = await this.client.messages.create({
        ...anthropicRequest,
        stream: true
      });
      
      return stream;
    } catch (error) {
      console.error('[AnthropicClientAdapter] Error in streaming completion:', error);
      throw error;
    }
  }
  
  /**
   * Create a completion without streaming
   */
  async createCompletion(formattedRequest: FormattedRequest): Promise<ProviderResponse> {
    try {
      console.debug('[AnthropicClientAdapter] Creating completion with request:', 
        JSON.stringify({
          model: formattedRequest.model,
          messageCount: formattedRequest.messages?.length,
          hasSystemInMessages: formattedRequest.messages?.some(m => m.role === 'system'),
          hasSystemProperty: !!formattedRequest.system
        }));
      
      // Convert the request format to Anthropic-specific format
      const anthropicRequest = this.adaptRequestFormat(formattedRequest);
      
      console.debug('[AnthropicClientAdapter] Adapted request format:', 
        JSON.stringify({
          model: anthropicRequest.model,
          messageCount: anthropicRequest.messages?.length,
          systemPrompt: anthropicRequest.system ? 'present' : 'missing'
        }));
      
      // Log the exact payload being sent to Anthropic
      console.debug('[AnthropicClientAdapter] Sending payload to Anthropic:', 
        JSON.stringify({
          model: anthropicRequest.model,
          max_tokens: anthropicRequest.max_tokens,
          temperature: anthropicRequest.temperature,
          top_p: anthropicRequest.top_p,
          messages: anthropicRequest.messages,
          system: anthropicRequest.system,
          stream: false
        }));
      
      const response = await this.client.messages.create({
        ...anthropicRequest,
        stream: false
      });
      
      // Log the raw response from Anthropic
      console.debug('[AnthropicClientAdapter] Raw response from Anthropic:', 
        JSON.stringify(response));
      
      return this.adaptResponseFormat(response);
    } catch (error) {
      console.error('[AnthropicClientAdapter] Error in completion:', error);
      throw error;
    }
  }
  
  /**
   * Adapt from standard FormattedRequest to Anthropic-specific format
   */
  private adaptRequestFormat(request: FormattedRequest): any {
    // Extract system message if present
    let systemMessage = request.system || '';
    let userMessages = [...(request.messages || [])];
    
    console.debug('[AnthropicClientAdapter] Adapting request format:', 
      JSON.stringify({
        initialSystemMessage: systemMessage ? 'present' : 'missing',
        initialMessageCount: userMessages.length,
        messageRoles: userMessages.map(m => m.role).join(',')
      }));
    
    // Look for system message in the messages array if not provided in request.system
    const systemIndex = userMessages.findIndex(msg => msg.role === 'system');
    if (systemIndex !== -1) {
      // Extract system message and remove it from the messages array
      systemMessage = userMessages[systemIndex].content;
      userMessages.splice(systemIndex, 1);
      
      console.debug('[AnthropicClientAdapter] Extracted system message from messages array:', 
        JSON.stringify({
          systemMessage: systemMessage.substring(0, 50) + (systemMessage.length > 50 ? '...' : ''),
          remainingMessageCount: userMessages.length
        }));
    }
    
    // Filter out empty assistant messages (common in streaming requests)
    const originalCount = userMessages.length;
    userMessages = userMessages.filter(msg => !(msg.role === 'assistant' && !msg.content));
    
    if (originalCount !== userMessages.length) {
      console.debug('[AnthropicClientAdapter] Filtered out empty assistant messages:', 
        JSON.stringify({
          before: originalCount,
          after: userMessages.length
        }));
    }
    
    // Convert standard format to Anthropic-specific format
    const anthropicRequest = {
      model: request.model,
      max_tokens: request.max_tokens,
      temperature: request.temperature,
      top_p: request.top_p,
      // Map remaining messages, converting roles to Anthropic format
      messages: userMessages.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content
      })),
      // Set system message as separate property
      system: systemMessage
    };
    
    console.debug('[AnthropicClientAdapter] Final Anthropic request format:', 
      JSON.stringify({
        model: anthropicRequest.model,
        messageCount: anthropicRequest.messages.length,
        systemPromptLength: anthropicRequest.system.length,
        messageRoles: anthropicRequest.messages.map(m => m.role).join(',')
      }));
    
    return anthropicRequest;
  }
  
  /**
   * Adapt from Anthropic-specific response to standard format
   */
  private adaptResponseFormat(response: any): ProviderResponse {
    console.debug('[AnthropicClientAdapter] Adapting response format:', 
      JSON.stringify({
        hasContent: !!response.content,
        contentLength: response.content?.length,
        hasUsage: !!response.usage,
        contentType: response.content?.[0]?.type,
        fullResponse: response
      }));
    
    // Create a standardized response format that matches OpenAI's format
    const standardResponse = {
      id: response.id || `anthropic-${Date.now()}`,
      model: response.model || 'claude',
      choices: [{
        message: {
          content: response.content?.[0]?.text || ''
        }
      }],
      usage: response.usage || {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0
      }
    };

    console.debug('[AnthropicClientAdapter] Standardized response:', JSON.stringify(standardResponse));
    
    return standardResponse;
  }
}