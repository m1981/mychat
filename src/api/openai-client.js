
import OpenAI from 'openai';

export class OpenAIClient {
  constructor(apiKey, requestId) {
    this.client = new OpenAI({ apiKey });
    this.requestId = requestId;
  }
  
  async createStreamingMessage(params) {
    // Format messages for OpenAI API if needed
    const formattedParams = this._formatParams(params);
    
    try {
      // Return the stream directly from the OpenAI SDK
      const stream = await this.client.chat.completions.create({
        ...formattedParams,
        stream: true
      });
      
      // Ensure the stream is properly formatted
      return stream;
    } catch (error) {
      console.error('Error creating streaming message:', error);
      throw error;
    }
  }
  
  async createMessage(params) {
    // Format messages for OpenAI API if needed
    const formattedParams = this._formatParams(params);
    
    return await this.client.chat.completions.create({
      ...formattedParams,
      stream: false
    });
  }
  
  _formatParams(params) {
    // Convert generic params to OpenAI-specific format
    // Make sure all required parameters are included
    return {
      model: params.model || 'gpt-4o',
      max_tokens: params.max_tokens || 4096,
      temperature: params.temperature || 0.7,
      messages: params.messages,
      // Include these parameters if they exist
      presence_penalty: params.presence_penalty,
      frequency_penalty: params.frequency_penalty,
      top_p: params.top_p
    };
  }
}

export default OpenAIClient;