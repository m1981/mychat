# Configuration Structure Specification

## Overview

This document outlines the restructured configuration system for our AI chat application. The goal is to eliminate circular dependencies, standardize patterns, centralize defaults, and improve type sharing.

## Directory Structure

```
src/
└── config/
    ├── constants.ts                 # Shared constants
    ├── types/                       # Shared type definitions
    │   ├── provider.types.ts        # Provider-related types
    │   ├── model.types.ts           # Model-related types
    │   └── chat.types.ts            # Chat-related types
    ├── providers/
    │   ├── registry.ts              # Provider registry
    │   └── defaults.ts              # Provider defaults
    ├── models/
    │   ├── registry.ts              # Model registry
    │   └── defaults.ts              # Model defaults
    └── chat/
        ├── config.ts                # Chat configuration
        └── defaults.ts              # Chat defaults
```

## Type Definitions

### 1. Provider Types (`config/types/provider.types.ts`)

```typescript
export type ProviderKey = 'anthropic' | 'openai' | string;

export interface ProviderModel {
  id: string;
  name: string;
  maxCompletionTokens: number;
  cost: {
    input?: { price: number; unit: number };
    output?: { price: number; unit: number };
  };
}

export interface ProviderConfig {
  id: ProviderKey;
  name: string;
  models: ProviderModel[];
  defaultModel: string;
  endpoints: string[];
}

export interface ProviderCapabilities {
  supportsThinking: boolean;
  defaultThinkingModel?: string;
  maxCompletionTokens: number;
  defaultModel: string;
}
```

### 2. Model Types (`config/types/model.types.ts`)

```typescript
import { ProviderKey } from './provider.types';

export interface ModelCapabilities {
  modelId: string;
  provider: ProviderKey;
  maxResponseTokens: number;
  defaultResponseTokens: number;
  supportsThinking?: boolean;
  defaultThinkingBudget?: number;
}

export interface ModelConfig {
  model: string;
  max_tokens: number;
  temperature: number;
  presence_penalty: number;
  top_p: number;
  frequency_penalty: number;
  enableThinking: boolean;
  thinkingConfig: {
    budget_tokens: number;
  };
}
```

### 3. Chat Types (`config/types/chat.types.ts`)

```typescript
import { ProviderKey } from './provider.types';
import { ModelConfig } from './model.types';

export type Role = 'user' | 'assistant' | 'system';

export interface ChatConfig {
  provider: ProviderKey;
  modelConfig: ModelConfig;
}

export interface MessageInterface {
  role: Role;
  content: string;
}

export interface ChatInterface {
  id: string;
  title: string;
  folder?: string;
  messages: MessageInterface[];
  config: ChatConfig;
  titleSet: boolean;
  currentChatTokenCount?: number;
  timestamp?: number;
}
```

## Shared Constants (`config/constants.ts`)

```typescript
import { ProviderKey } from './types/provider.types';

// Core constants
export const DEFAULT_PROVIDER: ProviderKey = 'anthropic';
export const DEFAULT_SYSTEM_MESSAGE = import.meta.env.VITE_DEFAULT_SYSTEM_MESSAGE ?? 
  'Be my helpful female advisor.';

// Feature flags
export const ENABLE_THINKING_BY_DEFAULT = false;
export const DEFAULT_THINKING_BUDGET = 1000;
```

## Registry Implementation

### 1. Provider Registry (`config/providers/registry.ts`)

```typescript
import { ProviderKey, ProviderConfig, ProviderCapabilities } from '../types/provider.types';
import { PROVIDER_CONFIGS } from './defaults';

export class ProviderRegistry {
  /**
   * Get provider configuration by key
   */
  static getProvider(key: ProviderKey): ProviderConfig {
    const provider = PROVIDER_CONFIGS[key];
    if (!provider) {
      throw new Error(`Provider ${key} not found`);
    }
    return provider;
  }

  /**
   * Get default model for a provider
   */
  static getDefaultModelForProvider(key: ProviderKey): string {
    return this.getProvider(key).defaultModel;
  }

  /**
   * Validate if a model belongs to a provider
   */
  static validateModelForProvider(provider: ProviderKey, modelId: string): boolean {
    return this.getProvider(provider).models.some(model => model.id === modelId);
  }

  /**
   * Get provider capabilities
   */
  static getProviderCapabilities(provider: ProviderKey): ProviderCapabilities {
    const providerConfig = this.getProvider(provider);
    const defaultModel = providerConfig.models.find(m => m.id === providerConfig.defaultModel);
    
    if (!defaultModel) {
      throw new Error(`Default model not found for provider ${provider}`);
    }

    if (provider === 'anthropic') {
      return {
        supportsThinking: true,
        defaultThinkingModel: providerConfig.defaultModel,
        maxCompletionTokens: defaultModel.maxCompletionTokens,
        defaultModel: providerConfig.defaultModel
      };
    }
    
    if (provider === 'openai') {
      return {
        supportsThinking: false,
        maxCompletionTokens: defaultModel.maxCompletionTokens,
        defaultModel: providerConfig.defaultModel
      };
    }

    return {
      supportsThinking: false,
      maxCompletionTokens: defaultModel.maxCompletionTokens,
      defaultModel: providerConfig.defaultModel
    };
  }
}
```

### 2. Model Registry (`config/models/registry.ts`)

```typescript
import { ProviderKey } from '../types/provider.types';
import { ModelCapabilities } from '../types/model.types';
import { MODEL_CAPABILITIES } from './defaults';

export class ModelRegistry {
  /**
   * Get model capabilities by model ID
   */
  static getModelCapabilities(modelId: string): ModelCapabilities {
    const capabilities = MODEL_CAPABILITIES.get(modelId);
    if (!capabilities) {
      throw new Error(`Model ${modelId} not found in registry`);
    }
    return capabilities;
  }

  /**
   * Validate and adjust response tokens for a model
   */
  static validateResponseTokens(modelId: string, requestedTokens?: number): number {
    const capabilities = this.getModelCapabilities(modelId);
    if (!requestedTokens) {
      return capabilities.defaultResponseTokens;
    }
    return Math.min(requestedTokens, capabilities.maxResponseTokens);
  }

  /**
   * Get all models for a provider
   */
  static getModelsForProvider(provider: ProviderKey): string[] {
    return Array.from(MODEL_CAPABILITIES.entries())
      .filter(([_, caps]) => caps.provider === provider)
      .map(([modelId]) => modelId);
  }

  /**
   * Validate if a model belongs to a provider
   */
  static validateModelForProvider(provider: ProviderKey, modelId: string): boolean {
    const capabilities = MODEL_CAPABILITIES.get(modelId);
    return capabilities?.provider === provider;
  }

  /**
   * Check if a model is supported
   */
  static isModelSupported(modelId: string): boolean {
    return MODEL_CAPABILITIES.has(modelId);
  }
}
```

## Default Configurations

### 1. Provider Defaults (`config/providers/defaults.ts`)

```typescript
import { ProviderKey, ProviderConfig } from '../types/provider.types';

export const PROVIDER_CONFIGS: Record<ProviderKey, ProviderConfig> = {
  anthropic: {
    id: 'anthropic',
    name: 'Anthropic',
    defaultModel: 'claude-3-7-sonnet-20250219',
    endpoints: ['/chat/anthropic'],
    models: [
      {
        id: 'claude-3-7-sonnet-20250219',
        name: 'Claude 3.7 Sonnet',
        maxCompletionTokens: 8192,
        cost: {
          input: { price: 0.003, unit: 1000 },
          output: { price: 0.015, unit: 1000 }
        }
      },
      // Other models...
    ]
  },
  openai: {
    id: 'openai',
    name: 'OpenAI',
    defaultModel: 'gpt-4o',
    endpoints: ['chat/openai'],
    models: [
      // Models...
    ]
  }
};
```

### 2. Model Defaults (`config/models/defaults.ts`)

```typescript
import { ModelCapabilities } from '../types/model.types';

export const MODEL_CAPABILITIES: Map<string, ModelCapabilities> = new Map([
  ['claude-3-7-sonnet-20250219', {
    modelId: 'claude-3-7-sonnet-20250219',
    provider: 'anthropic',
    maxResponseTokens: 8192,
    defaultResponseTokens: 4096,
    supportsThinking: true,
    defaultThinkingBudget: 16000
  }],
  ['gpt-4o', {
    modelId: 'gpt-4o',
    provider: 'openai',
    maxResponseTokens: 4096,
    defaultResponseTokens: 1024
  }],
  // Other models...
]);
```

### 3. Chat Configuration (`config/chat/config.ts`)

```typescript
import { ChatConfig, ChatInterface } from '../types/chat.types';
import { ModelConfig } from '../types/model.types';
import { DEFAULT_PROVIDER, DEFAULT_SYSTEM_MESSAGE } from '../constants';
import { ProviderRegistry } from '../providers/registry';
import { ModelRegistry } from '../models/registry';
import { v4 as uuidv4 } from 'uuid';

/**
 * Create default model configuration based on provider
 */
export function createDefaultModelConfig(provider = DEFAULT_PROVIDER): Readonly<ModelConfig> {
  const defaultProvider = ProviderRegistry.getProvider(provider);
  const defaultModel = defaultProvider.defaultModel;
  const modelCapabilities = ModelRegistry.getModelCapabilities(defaultModel);

  return Object.freeze({
    model: defaultModel,
    max_tokens: modelCapabilities.defaultResponseTokens,
    temperature: 0,
    presence_penalty: 0,
    top_p: 1,
    frequency_penalty: 0,
    enableThinking: false,
    thinkingConfig: Object.freeze({
      budget_tokens: modelCapabilities.defaultThinkingBudget || 1000,
    }),
  });
}

/**
 * Default chat configuration
 */
export const DEFAULT_MODEL_CONFIG = createDefaultModelConfig();

export const DEFAULT_CHAT_CONFIG: Readonly<ChatConfig> = Object.freeze({
  provider: DEFAULT_PROVIDER,
  modelConfig: DEFAULT_MODEL_CONFIG,
});

/**
 * Generate a default chat with specified title and folder
 */
export function generateDefaultChat(
  title: string, 
  folder?: string, 
  systemMessage = DEFAULT_SYSTEM_MESSAGE
): ChatInterface {
  return {
    id: uuidv4(),
    title,
    folder,
    messages: [
      {
        role: 'system',
        content: systemMessage
      }
    ],
    config: DEFAULT_CHAT_CONFIG,
    titleSet: true,
    timestamp: Date.now()
  };
}
```

## Usage Examples

### Importing Types

```typescript
// Import only the types you need
import { ChatConfig } from '@config/types/chat.types';
import { ProviderKey } from '@config/types/provider.types';
```

### Using Constants

```typescript
import { DEFAULT_PROVIDER, DEFAULT_SYSTEM_MESSAGE } from '@config/constants';
```

### Using Registries

```typescript
import { ProviderRegistry } from '@config/providers/registry';
import { ModelRegistry } from '@config/models/registry';

// Get provider capabilities
const capabilities = ProviderRegistry.getProviderCapabilities('anthropic');

// Validate model tokens
const tokens = ModelRegistry.validateResponseTokens('claude-3-7-sonnet-20250219', 5000);
```

### Creating Default Configurations

```typescript
import { DEFAULT_CHAT_CONFIG, generateDefaultChat } from '@config/chat/config';

// Create a new chat with default configuration
const newChat = generateDefaultChat('My Chat', 'personal');
```

## Migration Strategy

1. Create the new directory structure and files
2. Move types to their respective files
3. Update imports in existing files
4. Test for circular dependencies
5. Update tests to use the new structure
6. Gradually migrate existing code to use the new configuration system

```
// Before
import { DEFAULT_SYSTEM_MESSAGE } from '@config/chat/ChatConfig';
import { DEFAULT_MODEL_CONFIG } from '@config/chat/ModelConfig';

// After
import { DEFAULT_SYSTEM_MESSAGE } from '@config/constants';
import { DEFAULT_MODEL_CONFIG } from '@config/chat/config';
```

## Benefits

- **No Circular Dependencies**: Clear separation of types, constants, and implementations
- **Standardized Patterns**: Consistent approach to registries and configuration
- **Centralized Defaults**: Single source of truth for default values
- **Improved Type Sharing**: Types are defined in a way that prevents circular imports
- **Better Maintainability**: Easier to understand and extend the configuration system