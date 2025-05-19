# Provider Architecture Interfaces

This document outlines the key interfaces in our provider architecture design, along with the motivation behind each interface based on SOLID principles and React patterns.

## Core Interfaces

### `AIProviderInterface`

The main interface that all AI providers must implement.

**Motivation:**
- **Single Responsibility Principle (SRP)**: Each provider implementation focuses solely on handling communication with a specific AI service.
- **Open/Closed Principle (OCP)**: New providers can be added without modifying existing code.
- **Interface Segregation Principle (ISP)**: The interface defines only the essential methods needed by all providers.
- **Dependency Inversion Principle (DIP)**: Components depend on abstractions (the interface) rather than concrete implementations.
- **React Context Pattern**: Enables dependency injection through React's context system.

```typescript
export interface AIProviderInterface {
  formatRequest: (config: RequestConfig, messages: MessageInterface[]) => FormattedRequest;
  parseResponse: (response: any) => ProviderResponse;
  submitCompletion: (formattedRequest: FormattedRequest) => Promise<ProviderResponse>;
  submitStream: (formattedRequest: FormattedRequest) => Promise<ReadableStream>;
}
```

### `RequestConfig`

Configuration for AI requests, extending the base model config.

**Motivation:**
- **SRP**: Encapsulates all configuration parameters for a request.
- **OCP**: Extensible through optional fields for provider-specific features.
- **Composition over Inheritance**: Extends `ModelConfig` to reuse common configuration.
- **React Props Pattern**: Follows React's pattern of passing configuration as structured objects.

```typescript
export interface RequestConfig extends ModelConfig {
  stream?: boolean;  // Optional in incoming config
  thinking_mode?: {
    enabled: boolean;
    budget_tokens: number;
  };
}
```

### `FormattedRequest`

The standardized request format that providers convert to their specific API format.

**Motivation:**
- **SRP**: Represents the standardized request format across providers.
- **Liskov Substitution Principle (LSP)**: All provider-specific request formats can be derived from this base structure.
- **OCP**: Extensible through the index signature for provider-specific fields.
- **Information Hiding**: Abstracts provider-specific request details from components.

```typescript
export interface FormattedRequest {
  // Common fields required by all providers
  messages: any[]; // Provider-specific message format
  model: string;
  max_tokens: number;
  temperature: number;
  top_p: number;
  stream: boolean;
  
  // Optional provider-specific fields
  system?: string;         // For providers that support system prompts
  thinking?: {             // For providers that support thinking mode
    type: string;          // Type of thinking mode
    budget_tokens: number;
  };
  presence_penalty?: number;
  frequency_penalty?: number;
  
  // Allow additional provider-specific fields
  [key: string]: unknown;
}
```

### `ProviderResponse`

A standardized response format that providers convert their API responses to.

**Motivation:**
- **SRP**: Standardizes response formats across different providers.
- **LSP**: All provider-specific responses can be mapped to this common structure.
- **OCP**: Extensible through the index signature for provider-specific fields.
- **Adapter Pattern**: Acts as an adapter between provider-specific responses and application-wide format.

```typescript
export interface ProviderResponse {
  content?: string | Array<{text: string}>;
  choices?: Array<{
    message?: { content?: string };
    delta?: { content?: string };
  }>;
  type?: string;
  delta?: { 
    text?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}
```

### `MessageInterface`

Represents a message in a conversation.

**Motivation:**
- **SRP**: Encapsulates the structure of a single message.
- **Common Data Structure**: Provides a consistent format for messages across the application.
- **Data Transfer Object Pattern**: Acts as a pure data container for message information.

```typescript
export interface MessageInterface {
  role: 'system' | 'user' | 'assistant';
  content: string;
  id?: string;
  timestamp?: number;
}
```

### `ModelConfig`

Base configuration for AI models.

**Motivation:**
- **SRP**: Centralizes model-specific configuration parameters.
- **Separation of Concerns**: Separates model configuration from provider configuration.
- **Configuration Object Pattern**: Follows the pattern of grouping related configuration parameters.

```typescript
export interface ModelConfig {
  model: string;
  temperature: number;
  max_tokens: number;
  top_p: number;
  presence_penalty?: number;
  frequency_penalty?: number;
  enableThinking?: boolean;
  thinkingConfig?: {
    budget_tokens: number;
  };
}
```

## Provider Registry Types

### `ProviderKey`

Type for supported providers.

**Motivation:**
- **Type Safety**: Ensures provider keys are valid throughout the application.
- **Extensibility**: Allows for adding new providers while maintaining type safety.

```typescript
export type ProviderKey = 'openai' | 'anthropic' | string;
```

### `ProviderConfig`

Configuration for a provider in the registry.

**Motivation:**
- **SRP**: Centralizes provider configuration management.
- **OCP**: New providers can be added by extending the registry.
- **DIP**: Components depend on the registry abstraction rather than specific providers.
- **Factory Pattern**: The registry acts as a factory for provider instances.
- **React Configuration Pattern**: Follows React's pattern of centralized configuration.

```typescript
export interface ProviderConfig {
  id: string;
  name: string;
  defaultModel: string;
  endpoints: string[];
  models: Array<{
    id: string;
    name: string;
    maxCompletionTokens: number;
    cost: {
      input: { price: number, unit: number };
      output: { price: number, unit: number };
    }
  }>;
}
```

## Context Types

### `ProviderContextType`

Type for the provider context.

**Motivation:**
- **DIP**: Components depend on the provider abstraction through context.
- **React Context API**: Leverages React's built-in dependency injection mechanism.
- **Inversion of Control**: Control over provider selection is moved to the context provider.
- **Composition Pattern**: Enables composition of components with provider capabilities.

```typescript
export type ProviderContextType = AIProviderInterface | null;
```

## Hook Return Types

### `UseTitleGenerationReturn`

Return type for the useTitleGeneration hook.

**Motivation:**
- **SRP**: The hook has a single, focused responsibility.
- **ISP**: Hook interface exposes only the methods needed by consumers.
- **React Hooks Pattern**: Follows React's pattern of encapsulating logic in hooks.
- **Command Pattern**: Each method represents a specific command operation.

```typescript
export interface UseTitleGenerationReturn {
  generateTitle: (
    messages: MessageInterface[], 
    config: ModelConfig,
    chatIndex?: number
  ) => Promise<void>;
}
```

### `UseChatCompletionReturn`

Return type for the useChatCompletion hook.

**Motivation:**
- **SRP**: The hook has a single, focused responsibility.
- **ISP**: Hook interface exposes only the methods needed by consumers.
- **React Hooks Pattern**: Follows React's pattern of encapsulating logic in hooks.
- **Facade Pattern**: Provides a simplified interface to the underlying provider complexity.

```typescript
export interface UseChatCompletionReturn {
  generateCompletion: (
    messages: MessageInterface[],
    config: ModelConfig
  ) => Promise<string>;
  
  generateCompletionStream: (
    messages: MessageInterface[],
    config: ModelConfig,
    onChunk: (chunk: string) => void
  ) => Promise<void>;
}
```

## Overall Architecture Benefits

1. **Decoupling**: Components are decoupled from specific provider implementations.
2. **Testability**: Interfaces enable easy mocking for unit tests.
3. **Maintainability**: Clear contracts make the codebase easier to understand and maintain.
4. **Extensibility**: New providers can be added without modifying existing code.
5. **Consistency**: Standardized interfaces ensure consistent behavior across providers.
6. **Separation of Concerns**: Each interface has a clear, focused responsibility.
7. **React Integration**: The architecture aligns with React's component model and hooks pattern.

This architecture successfully applies SOLID principles within the React ecosystem, creating a flexible, maintainable system for integrating multiple AI providers.
