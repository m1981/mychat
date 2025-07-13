import OpenAI from 'openai';

import { FormattedRequest, ProviderResponse } from '../../types/provider';

import { ProviderClientAdapter } from './provider-client-adapter';

/**
 * Adapter for OpenAI API client
 * Handles direct SDK interaction in both server and client environments
 */
export class OpenAIClientAdapter implements ProviderClientAdapter {
  private client: OpenAI;
  private requestId: string;
  
  constructor(apiKey: string, requestId?: string) {
    this.client = new OpenAI({ apiKey });
    this.requestId = requestId || Date.now().toString(36);
  }
  
  /**
   * Create a completion with streaming
   */
  async createStreamingCompletion(formattedRequest: FormattedRequest): Promise<any> {
    try {
      // Return the stream directly from the OpenAI SDK
      const stream = await this.client.chat.completions.create({
        ...this.adaptRequestFormat(formattedRequest),
        stream: true
      });
      
      return stream;
    } catch (error) {
      console.error('Error in OpenAI streaming completion:', error);
      throw error;
    }
  }
  
  /**
   * Create a completion without streaming
   */
  async createCompletion(formattedRequest: FormattedRequest): Promise<ProviderResponse> {
    try {
      const response = await this.client.chat.completions.create({
        ...this.adaptRequestFormat(formattedRequest),
        stream: false
      });
      
      return response;
    } catch (error) {
      console.error('Error in OpenAI completion:', error);
      throw error;
    }
  }
  
  /**
   * Adapt from standard FormattedRequest to OpenAI-specific format
   */
  private adaptRequestFormat(request: FormattedRequest): any {
    // Convert standard format to OpenAI-specific format
    return {
      model: request.model,
      max_tokens: request.max_tokens,
      temperature: request.temperature,
      top_p: request.top_p,
      presence_penalty: request.presence_penalty,
      frequency_penalty: request.frequency_penalty,
      messages: request.messages
    };
  }
}