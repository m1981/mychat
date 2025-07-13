import { PROVIDER_CONFIGS } from '@config/providers/provider.config';
import { AnthropicClientAdapter } from '@api/clients/anthropic-client';
import { AIProviderBase, ProviderKey, ProviderCapabilities, MessageInterface, RequestConfig, FormattedRequest, ProviderResponse } from '@type/provider';
import { getApiKey } from '@utils/auth';

export class AnthropicProvider implements AIProviderBase {
  readonly id: ProviderKey;
  readonly name: string;
  readonly endpoints: string[];
  readonly models: string[];
  readonly capabilities: ProviderCapabilities;

  constructor() {
    // Get configuration from provider config
    const config = PROVIDER_CONFIGS.anthropic;
    
    this.id = 'anthropic';
    this.name = config.name;
    this.endpoints = config.endpoints;
    this.models = config.models.map(m => m.id);
    this.capabilities = {
      supportsThinking: config.capabilities.supportsThinking,
      maxCompletionTokens: config.models[0].maxCompletionTokens,
      defaultModel: config.defaultModel,
      defaultThinkingModel: config.defaultModel
    };
  }
  
  formatRequest(messages: MessageInterface[], config: RequestConfig): FormattedRequest {
    // Format messages for Anthropic API
    return {
      model: config.model,
      max_tokens: config.max_tokens,
      temperature: config.temperature,
      top_p: config.top_p,
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      stream: config.stream || false,
      // Add thinking mode if supported and enabled
      ...(config.thinking?.enabled && {
        thinking: {
          type: "thinking_out_loud",
          budget_tokens: config.thinking.budget_tokens
        }
      })
    };
  }
  
  async submitCompletion(formattedRequest: FormattedRequest): Promise<ProviderResponse> {
    const apiKey = getApiKey(this.id);
    if (!apiKey) throw new Error(`No API key found for ${this.id}`);
    
    const client = new AnthropicClientAdapter(apiKey);
    return await client.createCompletion(formattedRequest);
  }
  
  async submitStream(formattedRequest: FormattedRequest): Promise<ReadableStream> {
    const apiKey = getApiKey(this.id);
    if (!apiKey) throw new Error(`No API key found for ${this.id}`);
    
    const client = new AnthropicClientAdapter(apiKey);
    return await client.createStreamingCompletion(formattedRequest);
  }
  
  parseResponse(response: any): string {
    console.debug('[AnthropicProvider] Parsing response:', JSON.stringify(response));
    
    // Check if response is in the standard format we expect
    if (response?.choices?.[0]?.message?.content) {
      return response.choices[0].message.content;
    }
    
    // Handle Anthropic-specific format if it comes through directly
    if (response?.content?.[0]?.text) {
      return response.content[0].text;
    }
    
    // Fallback for any other format
    return '';
  }
  
  parseStreamingResponse(chunk: any): string {
    console.debug('[AnthropicProvider] Parsing streaming chunk:', JSON.stringify(chunk));
    
    // Handle formatted chunks from the API route
    if (chunk.choices && chunk.choices[0] && chunk.choices[0].delta) {
      return chunk.choices[0].delta.content || '';
    }
    
    // Handle raw Anthropic chunks
    if (chunk.type === 'content_block_delta') {
      return chunk.delta?.text || '';
    }
    
    return '';
  }
}
