import Anthropic from '@anthropic-ai/sdk';

export class AnthropicClient {
  constructor(apiKey, requestId) {
    this.client = new Anthropic({ apiKey });
    this.requestId = requestId;
  }
  
  async createStreamingMessage(params) {
    // Format messages for Anthropic API if needed
    const formattedParams = this._formatParams(params);
    
    return await this.client.messages.create({
      ...formattedParams,
      stream: true
    });
  }
  
  async createMessage(params) {
    // Format messages for Anthropic API if needed
    const formattedParams = this._formatParams(params);
    
    return await this.client.messages.create({
      ...formattedParams,
      stream: false
    });
  }
  
  // Helper method to format messages according to Anthropic's API requirements
  _formatParams(params) {
    // Make a copy to avoid modifying the original
    const formattedParams = { ...params };
    
    // Ensure messages are in the correct format for Anthropic
    if (formattedParams.messages && Array.isArray(formattedParams.messages)) {
      formattedParams.messages = formattedParams.messages.map(msg => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content
      }));
    }
    
    return formattedParams;
  }
}

export default AnthropicClient;