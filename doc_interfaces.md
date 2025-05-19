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
    /**
     * Unique identifier for the provider
     */
    id: string;

    /**
     * Display name of the provider
     */
    name: string;

    /**
     * List of API endpoints this provider can use
     */
    endpoints: string[];

    /**
     * List of model IDs supported by this provider
     */
    models: string[];

    /**
     * Converts application request format to provider-specific format
     * @param config - Configuration for the request
     * @param messages - Array of messages to send to the AI
     * @returns Formatted request ready to send to the provider's API
     */
    formatRequest: (config: RequestConfig, messages: MessageInterface[]) => FormattedRequest;

    /**
     * Extracts content from a provider's non-streaming response
     * @param response - Raw response from the provider's API
     * @returns Standardized response with extracted content
     */
    parseResponse: (response: any) => ProviderResponse;

    /**
     * Submits a completion request to the provider
     * @param formattedRequest - Request formatted for the provider's API
     * @returns Promise resolving to the provider's response
     */
    submitCompletion: (formattedRequest: FormattedRequest) => Promise<ProviderResponse>;

    /**
     * Submits a streaming request to the provider
     * @param formattedRequest - Request formatted for the provider's API
     * @returns Promise resolving to a ReadableStream of response chunks
     */
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
    /**
     * Whether to stream the response (true) or receive it all at once (false)
     * Optional in incoming config, defaults to false
     */
    stream?: boolean;

    /**
     * Configuration for thinking mode, which allows the AI to "think" before responding
     * This enables more thoughtful and comprehensive responses by allocating tokens for reasoning
     */
    thinking_mode?: {
        /**
         * Whether thinking mode is enabled for this request
         */
        enabled: boolean;

        /**
         * Maximum number of tokens to allocate for thinking
         * Higher values allow for more complex reasoning but consume more tokens
         */
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
    /**
     * Array of messages in provider-specific format
     * Each provider may have different message structure requirements
     */
    messages: any[];

    /**
     * Model identifier to use for this request (e.g., "gpt-4o", "claude-3-7-sonnet")
     */
    model: string;

    /**
     * Maximum number of tokens to generate in the response
     */
    max_tokens: number;

    /**
     * Controls randomness: 0 = deterministic, 1 = maximum randomness
     * Lower values make output more focused and deterministic
     * Higher values introduce more randomness and creativity
     */
    temperature: number;

    /**
     * Nucleus sampling parameter between 0 and 1
     * Only considers tokens with cumulative probability <= top_p
     * Lower values make output more focused on high-probability tokens
     */
    top_p: number;

    /**
     * Whether to stream the response (true) or receive it all at once (false)
     */
    stream: boolean;

    /**
     * System prompt to set context for the conversation
     * Only for providers that support system prompts (e.g., OpenAI, Anthropic)
     */
    system?: string;

    /**
     * Configuration for thinking mode
     * Only for providers that support thinking capabilities (e.g., Anthropic)
     */
    thinking?: {
        /**
         * Type of thinking mode (e.g., "enabled")
         */
        type: string;

        /**
         * Maximum number of tokens to allocate for thinking
         */
        budget_tokens: number;
    };

    /**
     * Reduces repetition of the same tokens
     * Higher values decrease likelihood of repeating the same phrases
     */
    presence_penalty?: number;

    /**
     * Reduces repetition of the same topics
     * Higher values decrease likelihood of discussing the same topics
     */
    frequency_penalty?: number;

    /**
     * Allow additional provider-specific fields
     * Enables extensibility for provider-specific parameters
     */
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
    /**
     * Main content of the response
     * Can be a string or an array of content blocks (for providers like Anthropic)
     */
    content?: string | Array<{text: string}>;

    /**
     * Array of choices (for providers like OpenAI)
     * Each choice contains a message or delta with content
     */
    choices?: Array<{
        /**
         * Complete message in non-streaming responses
         */
        message?: {
            /**
             * Content of the message
             */
            content?: string
        };

        /**
         * Delta in streaming responses
         */
        delta?: {
            /**
             * Content chunk in the delta
             */
            content?: string
        };
    }>;

    /**
     * Type of response (for providers like Anthropic)
     * E.g., "content_block_delta" for streaming responses
     */
    type?: string;

    /**
     * Delta information for streaming responses (for providers like Anthropic)
     */
    delta?: {
        /**
         * Text chunk in the delta
         */
        text?: string;

        /**
         * Additional provider-specific delta fields
         */
        [key: string]: unknown;
    };

    /**
     * Allow additional provider-specific response fields
     * Enables extensibility for provider-specific response data
     */
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
    /**
     * Role of the message sender
     * - system: Instructions or context for the AI
     * - user: Messages from the human user
     * - assistant: Messages from the AI assistant
     */
    role: 'system' | 'user' | 'assistant';

    /**
     * Content of the message
     */
    content: string;

    /**
     * Optional unique identifier for the message
     */
    id?: string;

    /**
     * Optional timestamp when the message was created
     * Stored as milliseconds since epoch
     */
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
    /**
     * Model identifier (e.g., "gpt-4o", "claude-3-7-sonnet")
     */
    model: string;

    /**
     * Controls randomness: 0 = deterministic, 1 = maximum randomness
     * Lower values make output more focused and deterministic
     * Higher values introduce more randomness and creativity
     */
    temperature: number;

    /**
     * Maximum number of tokens to generate in the response
     * Higher values allow for longer responses but may increase costs
     */
    max_tokens: number;

    /**
     * Nucleus sampling parameter between 0 and 1
     * Only considers tokens with cumulative probability <= top_p
     * Lower values make output more focused on high-probability tokens
     */
    top_p: number;

    /**
     * Reduces repetition of the same tokens
     * Higher values decrease likelihood of repeating the same phrases
     * Optional, as not all providers support this
     */
    presence_penalty?: number;

    /**
     * Reduces repetition of the same topics
     * Higher values decrease likelihood of discussing the same topics
     * Optional, as not all providers support this
     */
    frequency_penalty?: number;

    /**
     * Whether thinking capability is enabled for this model
     * Thinking allows the AI to reason through complex problems before responding
     */
    enableThinking?: boolean;

    /**
     * Configuration for thinking mode
     */
    thinkingConfig?: {
        /**
         * Maximum number of tokens to allocate for thinking
         * Higher values allow for more complex reasoning but consume more tokens
         */
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
/**
 * Identifier for supported AI providers
 * - 'openai': OpenAI API (GPT models)
 * - 'anthropic': Anthropic API (Claude models)
 * - string: Allows for future provider extensions
 */
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
    /**
     * Unique identifier for the provider
     */
    id: string;

    /**
     * Display name of the provider
     */
    name: string;

    /**
     * Default model ID to use for this provider
     */
    defaultModel: string;

    /**
     * List of API endpoints this provider can use
     */
    endpoints: string[];

    /**
     * Array of models supported by this provider
     */
    models: Array<{
        /**
         * Unique identifier for the model
         */
        id: string;

        /**
         * Display name of the model
         */
        name: string;

        /**
         * Maximum number of tokens the model can generate in a response
         */
        maxCompletionTokens: number;

        /**
         * Cost information for the model
         */
        cost: {
            /**
             * Cost for input tokens (prompts sent to the model)
             */
            input: {
                /**
                 * Price per unit of tokens (e.g., per 1000 tokens)
                 */
                price: number,

                /**
                 * Number of tokens per pricing unit (typically 1000)
                 */
                unit: number
            };

            /**
             * Cost for output tokens (responses generated by the model)
             */
            output: {
                /**
                 * Price per unit of tokens (e.g., per 1000 tokens)
                 */
                price: number,

                /**
                 * Number of tokens per pricing unit (typically 1000)
                 */
                unit: number
            };
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
/**
 * Type for the provider context
 * - AIProviderInterface: When a provider is selected and available
 * - null: When no provider is selected or available
 *
 * Used with React's Context API to make the current provider available throughout the component tree
 */
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
    /**
     * Generates a title for a chat based on its messages
     *
     * @param messages - Array of messages in the chat
     * @param config - Model configuration to use for title generation
     * @param chatIndex - Optional index of the chat to update (defaults to current chat)
     * @returns Promise that resolves when title generation is complete
     *
     * The function will:
     * 1. Check if the chat already has a title
     * 2. Create a special prompt for title generation
     * 3. Submit the request to the AI provider
     * 4. Update the chat with the generated title
     */
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
    /**
     * Generates a completion for a chat conversation
     *
     * @param messages - Array of messages in the conversation
     * @param config - Model configuration to use for completion
     * @returns Promise resolving to the generated completion text
     *
     * This method handles the entire completion process:
     * 1. Formatting the request for the provider
     * 2. Submitting the request
     * 3. Parsing the response
     */
    generateCompletion: (
        messages: MessageInterface[],
        config: ModelConfig
    ) => Promise<string>;

    /**
     * Generates a streaming completion for a chat conversation
     *
     * @param messages - Array of messages in the conversation
     * @param config - Model configuration to use for completion
     * @param onChunk - Callback function that receives each chunk of the response
     * @returns Promise that resolves when the stream is complete
     *
     * This method handles the streaming completion process:
     * 1. Formatting the request for the provider with streaming enabled
     * 2. Submitting the streaming request
     * 3. Processing each chunk and calling the onChunk callback
     */
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
