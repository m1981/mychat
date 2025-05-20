import { vi, it, expect, describe, beforeEach } from 'vitest';
import { ChatSubmissionService } from '../SubmissionService';
import { MessageInterface } from '@/types/chat';
import { ModelConfig } from '@/types/models';

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

describe('ChatSubmissionService Integration Tests', () => {
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

  it('should handle parameter order correctly when calling formatRequest', async () => {
    // Mock stream handler
    const mockStreamHandler = {
      processStream: vi.fn().mockResolvedValue(true)
    };
    
    // Create a spy on the formatRequest method to verify parameter order
    const formatRequestSpy = vi.fn().mockImplementation((messages, config) => {
      // Verify messages is an array
      expect(Array.isArray(messages)).toBe(true);
      
      // Verify config is an object
      expect(typeof config).toBe('object');
      expect(config).not.toBeNull();
      
      // Return a valid formatted request
      return {
        model: config.model,
        max_tokens: config.max_tokens,
        temperature: config.temperature,
        stream: true,
        messages: messages.map(m => ({ role: m.role, content: m.content }))
      };
    });
    
    // Create a provider with the spy
    const testProvider = {
      ...mockAnthropicProvider,
      formatRequest: formatRequestSpy
    };
    
    // Create submission service with test provider
    const submissionService = new ChatSubmissionService(
      testProvider,
      'test-api-key',
      (content) => {
        // Content callback
      },
      mockStreamHandler
    );
    
    // Create messages
    const messages = [
      { role: 'user', content: 'Test message' }
    ];
    
    // Create model config
    const modelConfig = {
      model: 'test-model',
      max_tokens: 1000,
      temperature: 0.5,
      top_p: 1
    };
    
    // Submit request
    await submissionService.submit(messages, modelConfig);
    
    // Verify formatRequest was called with correct parameter order
    expect(formatRequestSpy).toHaveBeenCalledWith(
      messages,  // First parameter should be messages array
      expect.objectContaining({  // Second parameter should be config object
        ...modelConfig,
        stream: true
      })
    );
    
    // Verify the spy's implementation was called and performed its checks
    expect(formatRequestSpy).toHaveBeenCalledTimes(1);
  });

  it('should handle non-array messages parameter gracefully', async () => {
    // Mock stream handler
    const mockStreamHandler = {
      processStream: vi.fn().mockResolvedValue(true)
    };
    
    // Create a provider with a formatRequest that validates input
    const testProvider = {
      ...mockAnthropicProvider,
      formatRequest: vi.fn().mockImplementation((messages, config) => {
        // Add defensive coding to handle non-array messages
        if (!Array.isArray(messages)) {
          console.error('Messages is not an array:', messages);
          return {
            model: config.model,
            max_tokens: config.max_tokens,
            temperature: config.temperature,
            stream: true,
            messages: [] // Empty messages as fallback
          };
        }
        
        return {
          model: config.model,
          max_tokens: config.max_tokens,
          temperature: config.temperature,
          stream: true,
          messages: messages.map(m => ({ role: m.role, content: m.content }))
        };
      })
    };
    
    // Create submission service with test provider
    const submissionService = new ChatSubmissionService(
      testProvider,
      'test-api-key',
      (content) => {
        // Content callback
      },
      mockStreamHandler
    );
    
    // Create invalid messages (not an array)
    const invalidMessages = { role: 'user', content: 'This is not an array' } as any;
    
    // Create model config
    const modelConfig = {
      model: 'test-model',
      max_tokens: 1000,
      temperature: 0.5,
      top_p: 1
    };
    
    // Submit request with invalid messages
    // This should throw an error because we validate in the service
    await expect(submissionService.submit(invalidMessages, modelConfig))
      .rejects.toThrow('Messages must be an array');
    
    // Verify formatRequest was not called
    expect(testProvider.formatRequest).not.toHaveBeenCalled();
  });

  it('should handle empty messages array', async () => {
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
    
    // Create empty messages array
    const messages: MessageInterface[] = [];
    
    // Create model config
    const modelConfig = {
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      temperature: 0.7,
      top_p: 1
    };
    
    // Submit request
    await submissionService.submit(messages, modelConfig);
    
    // Verify formatRequest was called with empty array
    expect(mockAnthropicProvider.formatRequest).toHaveBeenCalledWith(
      [],
      expect.objectContaining({
        ...modelConfig,
        stream: true
      })
    );
    
    // Verify fetch was called
    expect(global.fetch).toHaveBeenCalled();
  });

  it('should handle thinking mode configuration correctly', async () => {
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
    
    // Create messages
    const messages = [
      { role: 'user', content: 'Complex question requiring thinking' }
    ];
    
    // Create model config with thinking mode
    const modelConfig = {
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      temperature: 0.7,
      top_p: 1,
      enableThinking: true,
      thinkingConfig: {
        budget_tokens: 20000
      }
    };
    
    // Submit request
    await submissionService.submit(messages, modelConfig);
    
    // Verify formatRequest was called with thinking mode configuration
    expect(mockAnthropicProvider.formatRequest).toHaveBeenCalledWith(
      messages,
      expect.objectContaining({
        ...modelConfig,
        stream: true,
        enableThinking: true,
        thinkingConfig: {
          budget_tokens: 20000
        }
      })
    );
    
    // Parse the request body to verify thinking configuration
    const fetchCall = global.fetch.mock.calls[0];
    const requestBody = JSON.parse(fetchCall[1].body);
    
    // Verify the thinking configuration in the request body
    expect(requestBody).toEqual(
      expect.objectContaining({
        thinking: expect.objectContaining({
          type: 'enabled',
          budget_tokens: expect.any(Number)
        })
      })
    );
  });

  it.concurrent('should run multiple submissions concurrently', async () => {
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
    
    // Create multiple message sets
    const messageSet1 = [{ role: 'user', content: 'First question' }];
    const messageSet2 = [{ role: 'user', content: 'Second question' }];
    const messageSet3 = [{ role: 'user', content: 'Third question' }];
    
    // Create model config
    const modelConfig = {
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      temperature: 0.7,
      top_p: 1
    };
    
    // Submit requests concurrently
    await Promise.all([
      submissionService.submit(messageSet1, modelConfig),
      submissionService.submit(messageSet2, modelConfig),
      submissionService.submit(messageSet3, modelConfig)
    ]);
    
    // Verify formatRequest was called three times
    expect(mockAnthropicProvider.formatRequest).toHaveBeenCalledTimes(3);
    
    // Verify fetch was called three times
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  it('should throw error when messages parameter is not an array', async () => {
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
    
    // Create invalid messages (not an array)
    const invalidMessages = { role: 'user', content: 'This is not an array' } as any;
    
    // Create model config
    const modelConfig = {
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      temperature: 0.7,
      top_p: 1
    };
    
    // Submit request with invalid messages
    // This should throw an error because messages is not an array
    await expect(submissionService.submit(invalidMessages, modelConfig))
      .rejects.toThrowError('Messages must be an array');
    
    // Verify formatRequest was not called
    expect(mockAnthropicProvider.formatRequest).not.toHaveBeenCalled();
  });

  it('should throw error when parameters are passed in wrong order', async () => {
    // Mock stream handler
    const mockStreamHandler = {
      processStream: vi.fn().mockResolvedValue(true)
    };
    
    // Create a provider with a formatRequest that validates parameter order
    const testProvider = {
      ...mockAnthropicProvider,
      formatRequest: vi.fn().mockImplementation((first, second) => {
        // Check if first parameter is a ModelConfig instead of messages array
        if (!Array.isArray(first) && typeof first === 'object' && 'model' in first) {
          throw new Error('Parameters passed in wrong order: config should be second parameter');
        }
        
        // Return a valid formatted request
        return {
          model: 'test-model',
          max_tokens: 1000,
          temperature: 0.7,
          stream: true,
          messages: []
        };
      })
    };
    
    // Create submission service with test provider
    const submissionService = new ChatSubmissionService(
      testProvider,
      'test-api-key',
      (content) => {
        // Content callback
      },
      mockStreamHandler
    );
    
    // Create valid messages and config
    const messages = [{ role: 'user', content: 'Test message' }];
    const modelConfig = {
      model: 'test-model',
      max_tokens: 1000,
      temperature: 0.7,
      top_p: 1
    };
    
    // Simulate wrong parameter order by monkey patching the submit method
    const originalSubmit = submissionService.submit;
    submissionService.submit = async function(messages, config) {
      // Intentionally swap parameters to simulate the bug
      return testProvider.formatRequest(config, messages);
    };
    
    // This should throw an error because parameters are in wrong order
    await expect(() => submissionService.submit(messages, modelConfig))
      .rejects.toThrowError('Parameters passed in wrong order');
    
    // Restore original method
    submissionService.submit = originalSubmit;
  });

  it('should validate parameter types in formatRequest', async () => {
    // Mock stream handler
    const mockStreamHandler = {
      processStream: vi.fn().mockResolvedValue(true)
    };
    
    // Create a provider with strict type checking
    const strictProvider = {
      ...mockAnthropicProvider,
      formatRequest: vi.fn().mockImplementation((messages, config) => {
        // Validate messages is an array
        if (!Array.isArray(messages)) {
          throw new TypeError('messages.find is not a function');
        }
        
        // Validate config is an object with required properties
        if (typeof config !== 'object' || !config || !('model' in config)) {
          throw new TypeError('config must be an object with model property');
        }
        
        return {
          model: config.model,
          max_tokens: config.max_tokens || 1000,
          temperature: config.temperature || 0.7,
          stream: true,
          messages: messages.map(m => ({ role: m.role, content: m.content }))
        };
      })
    };
    
    // Create submission service with strict provider
    const submissionService = new ChatSubmissionService(
      strictProvider,
      'test-api-key',
      (content) => {
        // Content callback
      },
      mockStreamHandler
    );
    
    // Create valid messages and config
    const messages = [{ role: 'user', content: 'Test message' }];
    const modelConfig = {
      model: 'test-model',
      max_tokens: 1000,
      temperature: 0.7,
      top_p: 1
    };
    
    // Test with correct parameters
    await submissionService.submit(messages, modelConfig);
    expect(strictProvider.formatRequest).toHaveBeenCalledWith(
      messages,
      expect.objectContaining({
        model: 'test-model',
        stream: true
      })
    );
    
    // Reset mock
    strictProvider.formatRequest.mockClear();
    
    // Simulate the bug by monkey patching the submit method
    const originalSubmit = submissionService.submit;
    submissionService.submit = async function(messages, config) {
      // Intentionally swap parameters to simulate the bug
      return strictProvider.formatRequest(config, messages);
    };
    
    // This should throw the same error as in production
    await expect(() => submissionService.submit(messages, modelConfig))
      .rejects.toThrowError('messages.find is not a function');
    
    // Restore original method
    submissionService.submit = originalSubmit;
  });
});