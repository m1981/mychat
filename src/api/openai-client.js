import OpenAI from 'openai';

export class OpenAIClient {
  constructor(apiKey, requestId) {
    this.client = new OpenAI({ apiKey });
    this.requestId = requestId;
  }
  
  async createStreamingMessage(params) {
    // Format messages for OpenAI API if needed
    const formattedParams = this._formatParams(params);
    
    return await this.client.chat.completions.create({
      ...formattedParams,
      stream: true
    });
  }
  
  async createMessage(params) {
    // Format messages for OpenAI API if needed
    const formattedParams = this._formatParams(params);
    
    return await this.client.chat.completions.create({
      ...formattedParams,
      stream: false
    });
  }
  
  // Helper method to format messages according to OpenAI's API requirements
  _formatParams(params) {
    // Make a copy to avoid modifying the original
    const formattedParams = { ...params };
    
    // Remove any redundant config object if it exists
    if (formattedParams.config) {
      delete formattedParams.config;
    }
    
    // Remove apiKey if it was accidentally included
    if (formattedParams.apiKey) {
      delete formattedParams.apiKey;
    }
    
    return formattedParams;
  }
}

export default OpenAIClient;