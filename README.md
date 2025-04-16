## Provider Integration Specification

### 1. Provider Configuration Layer

#### Provider Registry
```typescript
type ProviderKey = 'openai' | 'anthropic';

interface ProviderConfig {
  id: ProviderKey;
  name: string;
  defaultModel: string;
  endpoints: string[];
  models: ProviderModel[];
}

const DEFAULT_PROVIDER: ProviderKey = 'anthropic';

const PROVIDER_CONFIGS = {
  maxTokensDefault: 1000,
  minTokens: 100,
  tokenStep: 100,
};
```

### 2. Provider Interface Layer

#### Core Provider Interface
```typescript
interface AIProvider {
  id: ProviderKey;
  name: string;
  endpoints: string[];
  models: string[];
  formatRequest: (messages: MessageInterface[], config: RequestConfig) => FormattedRequest;
  parseResponse: (response: any) => string;
  parseStreamingResponse: (chunk: any) => string;
}
```

#### Provider-Specific Request Formats

##### OpenAI Format
```typescript
interface OpenAIRequest {
  messages: MessageInterface[];
  model: string;
  max_tokens: number;
  temperature: number;
  presence_penalty: number;
  top_p: number;
  frequency_penalty: number;
  stream: boolean;
}
```

##### Anthropic Format
```typescript
interface AnthropicRequest {
  model: string;
  max_tokens: number;
  temperature: number;
  top_p: number;
  stream: boolean;
  thinking?: {
    type: 'enabled';
    budget_tokens: number;
  };
  messages: {
    role: 'assistant' | 'user';
    content: string;
  }[];
}
```

### 3. API Communication Layer

#### Request Flow
```typescript
interface APIRequest {
  messages: MessageInterface[];
  config: RequestConfig;
  apiKey: string;
}

interface StreamResponse {
  type: 'message_start' | 'content_block_start' | 'content_block_delta' | 
        'signature_delta' | 'content_block_stop' | 'message_delta' | 'message_stop';
  data?: any;
}
```

#### API Endpoints
- POST `/api/chat/openai`
- POST `/api/chat/anthropic`

### 4. Client Implementation

#### Chat Stream Handler
```typescript
class ChatStreamHandler {
  constructor(decoder: TextDecoder, provider: AIProvider);
  processStream(
    reader: ReadableStreamDefaultReader<Uint8Array>,
    onContent: (content: string) => void
  ): Promise<void>;
}
```

#### Submit Hook Configuration
```typescript
interface SubmitHookConfig {
  currentChatIndex: number;
  chats: ChatInterface[];
  apiKeys: Record<ProviderKey, string>;
  setError: (error: string) => void;
  setGenerating: (generating: boolean) => void;
  setChats: (chats: ChatInterface[]) => void;
}
```

### 5. Error Handling

#### API Error Response
```typescript
interface APIError {
  error: string;
  status?: number;
  type?: string;
  details?: unknown;
}
```

#### Error Categories
1. Authentication Errors
   - Invalid API keys
   - Expired credentials
2. Rate Limiting
   - Provider quotas
   - Concurrent request limits
3. Stream Processing
   - Connection drops
   - Malformed chunks
4. Token Management
   - Exceeding token limits
   - Invalid token configurations

### 6. Stream Processing Protocol

1. Stream Initialization
   ```typescript
   headers: {
     'Content-Type': 'text/event-stream',
     'Cache-Control': 'no-cache',
     'Connection': 'keep-alive'
   }
   ```

2. Keep-Alive Mechanism
   - 5-second interval pings
   - Format: `:keep-alive\n\n`

3. Chunk Processing
   - Message start/stop events
   - Content block deltas
   - Thinking mode blocks
   - Stream termination: `data: [DONE]\n\n`

### 7. Security Requirements

1. API Key Handling
   - Client-side storage only
   - Per-provider key management
   - Secure transmission in request headers

2. Request Validation
   - Message content sanitization
   - Token limit enforcement
   - Model compatibility checks

3. Response Processing
   - Content validation
   - Error state handling
   - Safe parsing of streaming data
