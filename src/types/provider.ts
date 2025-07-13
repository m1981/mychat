/**
 * Provider keys supported by the application
 */
export type ProviderKey = 'anthropic' | 'openai';

/**
 * Standard message format
 */
export interface Message {
  role: string;
  content: string;
}

/**
 * Standardized request format for all providers
 */
export interface FormattedRequest {
  model: string;
  max_tokens: number;
  temperature: number;
  top_p: number;
  presence_penalty?: number;
  frequency_penalty?: number;
  stream?: boolean;
  messages: Message[];
  system?: string;
  thinking?: string;
}

/**
 * Standardized response format for all providers
 */
export interface ProviderResponse {
  choices: {
    message?: {
      content: string;
    };
    delta?: {
      content: string;
    };
  }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}
