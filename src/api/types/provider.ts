/**
 * Shared types for provider interfaces
 * Used by both client and server code
 */

export interface FormattedRequest {
  model: string;
  max_tokens: number;
  temperature: number;
  top_p?: number;
  presence_penalty?: number;
  frequency_penalty?: number;
  messages: Array<{
    role: string;
    content: string;
    name?: string;
  }>;
  stream?: boolean;
  thinking_mode?: {
    enabled: boolean;
    budget_tokens?: number;
  };
  [key: string]: any;
}

export interface ProviderResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    message?: {
      role: string;
      content: string;
    };
    delta?: {
      content?: string;
    };
    finish_reason: string;
    index: number;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  [key: string]: any;
}

export interface ProviderCapabilities {
  supportsThinking: boolean;
  supportsVision?: boolean;
  supportsTools?: boolean;
  [key: string]: any;
}

export interface ModelConfig {
  provider?: ProviderKey;  // Make provider optional for backward compatibility
  model: string;
  max_tokens: number;
  temperature: number;
  top_p: number;
  presence_penalty: number;
  frequency_penalty: number;
  thinking_mode: {
    enabled: boolean;
    budget_tokens: number;
  };
}