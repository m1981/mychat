import { ProviderKey } from '@type/chat';

// Base configuration interface
export interface BaseModelConfig {
  model: string;
  max_tokens: number;
  temperature: number;
  top_p: number;
  presence_penalty: number;
  frequency_penalty: number;
}

// Capability-specific configuration interfaces
export interface ThinkingModeConfig {
  enabled: boolean;
  budget_tokens: number;
}

export interface FileUploadConfig {
  enabled: boolean;
  maxFiles: number;
  maxSizePerFile: number;
}

// Complete model configuration with all capabilities
export interface ModelConfig extends BaseModelConfig {
  capabilities?: {
    thinking_mode?: ThinkingModeConfig;
    file_upload?: FileUploadConfig;
    // Add other capabilities here
  };
}

// Chat configuration
export interface ChatConfig {
  provider: ProviderKey;
  modelConfig: ModelConfig;
  systemPrompt: string;
}

// Configuration update types (for partial updates)
export type ModelConfigUpdate = Partial<ModelConfig>;
export type ChatConfigUpdate = Partial<ChatConfig>;