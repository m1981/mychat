// src/types/config.ts - New centralized type file

import { ProviderKey } from './chat';

/**
 * Base model configuration interface
 * Contains common configuration options for all models
 */
export interface BaseModelConfig {
  /**
   * Model identifier (e.g., "gpt-4o", "claude-3-7-sonnet")
   */
  model: string;
  
  /**
   * Maximum number of tokens to generate
   */
  max_tokens: number;
  
  /**
   * Temperature setting (0-2)
   * Controls randomness: 0 = deterministic, 1 = balanced, 2 = maximum randomness
   */
  temperature: number;
  
  /**
   * Top-p setting (0-1)
   * Controls diversity via nucleus sampling
   */
  top_p?: number;
  
  /**
   * Presence penalty (-2 to 2)
   * Reduces repetition of the same tokens
   */
  presence_penalty?: number;
  
  /**
   * Frequency penalty (-2 to 2)
   * Reduces repetition of the same topics
   */
  frequency_penalty?: number;
}

/**
 * Thinking mode capability configuration
 */
export interface ThinkingModeConfig {
  /**
   * Whether thinking mode is enabled
   */
  enabled: boolean;
  
  /**
   * Maximum number of tokens to allocate for thinking
   */
  budget_tokens: number;
}

/**
 * File upload capability configuration
 */
export interface FileUploadConfig {
  /**
   * Whether file upload is enabled
   */
  enabled: boolean;
  
  /**
   * Maximum number of files that can be uploaded
   */
  maxFiles: number;
  
  /**
   * Maximum size per file in bytes
   */
  maxSizePerFile: number;
}

/**
 * Complete model configuration including capabilities
 */
export interface ModelConfig extends BaseModelConfig {
  /**
   * Optional capability-specific configurations
   */
  capabilities?: {
    /**
     * Thinking mode configuration
     */
    thinking_mode?: ThinkingModeConfig;
    
    /**
     * File upload configuration
     */
    file_upload?: FileUploadConfig;
    
    /**
     * Allow for future capabilities
     */
    [key: string]: any;
  };
}

/**
 * Partial update for model configuration
 */
export type ModelConfigUpdate = Partial<ModelConfig> & {
  capabilities?: Partial<ModelConfig['capabilities']>;
};

/**
 * Chat configuration
 */
export interface ChatConfig {
  /**
   * Provider key (e.g., 'openai', 'anthropic')
   */
  provider: ProviderKey;
  
  /**
   * Model configuration
   */
  modelConfig: ModelConfig;
  
  /**
   * System prompt/message
   */
  systemPrompt?: string;
}

/**
 * Partial update for chat configuration
 */
export type ChatConfigUpdate = Partial<ChatConfig> & {
  modelConfig?: Partial<ModelConfig>;
};

/**
 * Request configuration extending model config
 */
export interface RequestConfig extends ModelConfig {
  /**
   * Whether to stream the response
   */
  stream?: boolean;
}