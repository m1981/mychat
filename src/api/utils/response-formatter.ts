import { ProviderKey } from '../../types/provider';

/**
 * Formats streaming chunks consistently for both server and client
 * @param chunk The raw chunk from the provider API
 * @param provider The provider key
 * @returns Formatted chunk with consistent structure
 */
export function formatStreamingChunk(chunk: any, provider: ProviderKey): any {
  if (provider === 'anthropic') {
    // Handle different Anthropic chunk types
    if (chunk.type === 'content_block_delta') {
      return {
        choices: [{
          delta: {
            content: chunk.delta?.text || ''
          }
        }]
      };
    } else if (chunk.type === 'content_block_start') {
      // For content block start, extract text if available
      const text = chunk.content_block?.text || '';
      return {
        choices: [{
          delta: {
            content: text
          }
        }]
      };
    } else if (chunk.type === 'message_delta') {
      // For message delta, include any content updates
      return {
        choices: [{
          delta: {
            content: ''
          }
        }]
      };
    } else if (chunk.type === 'message_stop') {
      // Message stop doesn't contain content
      return {
        choices: [{
          delta: {
            content: ''
          }
        }]
      };
    }
  } else if (provider === 'openai') {
    return {
      choices: [{
        delta: {
          content: chunk.choices?.[0]?.delta?.content || ''
        }
      }]
    };
  }
  
  // Default format if provider-specific formatting fails
  return {
    choices: [{
      delta: {
        content: ''
      }
    }]
  };
}