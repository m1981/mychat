import { vi, it, expect, beforeEach } from 'vitest';
import { ChatSubmissionService } from '../SubmissionService';

// Mock the actual provider object directly
const mockAnthropicProvider = {
  id: 'anthropic',
  name: 'Anthropic',
  endpoints: ['/api/chat/anthropic'],
  models: ['claude-3-5-sonnet-20241022'],
  formatRequest: vi.fn().mockImplementation((messages, config) => {
    // Extract system message if present
    const systemMessage = messages.find(m => m.role === 'system');
    
    // Filter out system messages and empty messages for the regular message array
    const regularMessages = messages
      .filter(m => m.role !== 'system')
      .filter(m => m.content.trim() !== '')
      .map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      }));
    
    return {
      model: config.model,
      max_tokens: config.max_tokens,
      temperature: config.temperature,
      top_p: config.top_p,
      stream: config.stream ?? false,
      thinking: config.enableThinking ? {
        type: 'enabled',
        budget_tokens: config.thinkingConfig.budget_tokens
      } : undefined,
      // Add system parameter if system message exists
      ...(systemMessage && { system: systemMessage.content }),
      messages: regularMessages
    };
  }),
  parseResponse: vi.fn(),
  parseStreamingResponse: vi.fn()
};

// Mock useStore
vi.mock('@store/store', () => ({
  default: {
    getState: vi.fn().mockReturnValue({
      abortController: new AbortController()
    })
  }
}));

beforeEach(() => {
  // Reset mocks
  vi.clearAllMocks();
  
  // Reset formatRequest mock
  mockAnthropicProvider.formatRequest.mockClear();
  
  // Mock fetch
  global.fetch = vi.fn().mockImplementation(() => 
    Promise.resolve({
      ok: true,
      status: 200,
      headers: new Headers({ 'Content-Type': 'text/event-stream' }),
      body: {
        getReader: () => ({
          read: vi.fn().mockResolvedValue({ done: true })
        })
      }
    })
  );
});

it('should include system message in request to Anthropic API', async () => {
  // Mock stream handler
  const mockStreamHandler = {
    processStream: vi.fn().mockResolvedValue(true)
  };
  
  // Create submission service with Anthropic provider
  const submissionService = new ChatSubmissionService(
    mockAnthropicProvider,
    'test-api-key',
    (content) => {
      // Content callback
    },
    mockStreamHandler
  );
  
  // Create messages with system message
  const messages = [
    { role: 'system', content: 'You are a test assistant.' },
    { role: 'user', content: 'Hello' }
  ];
  
  // Create model config
  const modelConfig = {
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 4096,
    temperature: 0.7,
    presence_penalty: 0,
    top_p: 1,
    frequency_penalty: 0,
    stream: true,
    enableThinking: true,
    thinkingConfig: {
      budget_tokens: 16000
    }
  };
  
  // Submit request
  await submissionService.submit(messages, modelConfig);
  
  // Verify formatRequest was called with correct arguments
  expect(mockAnthropicProvider.formatRequest).toHaveBeenCalledWith(
    messages,
    expect.objectContaining({
      ...modelConfig,
      stream: true
    })
  );
  
  // Verify fetch was called with correct body
  expect(global.fetch).toHaveBeenCalledWith(
    expect.any(String),
    expect.objectContaining({
      method: 'POST',
      headers: expect.any(Object),
      body: expect.any(String)
    })
  );
  
  // Parse the request body to verify system message is included
  const fetchCall = global.fetch.mock.calls[0];
  const requestBody = JSON.parse(fetchCall[1].body);
  
  expect(requestBody).toEqual(
    expect.objectContaining({
      system: 'You are a test assistant.',
      messages: expect.arrayContaining([
        expect.objectContaining({
          role: 'user',
          content: 'Hello'
        })
      ])
    })
  );
});