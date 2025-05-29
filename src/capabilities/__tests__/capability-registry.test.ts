import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { capabilityRegistry } from '../registry';
import { CapabilityDefinition } from '@type/capability';
import { createMockCapability, clearMockCapabilities } from '../../test/test-utils';

describe('Capability Registry', () => {
  beforeEach(() => {
    // Reset registry between tests
    vi.resetAllMocks();
    clearMockCapabilities();
  });
  
  afterEach(() => {
    clearMockCapabilities();
  });
  
  it('should be a singleton', () => {
    // Get the registry instance twice
    const instance1 = capabilityRegistry;
    const instance2 = capabilityRegistry;
    
    // They should be the same object
    expect(instance1).toBe(instance2);
  });
  
  it('should register and retrieve capabilities', () => {
    const mockCapability = createMockCapability({
      id: 'test-capability',
      name: 'Test Capability'
    });
    
    capabilityRegistry.registerCapability(mockCapability);
    
    const supportedCapabilities = capabilityRegistry.getSupportedCapabilities('openai', 'gpt-4o');
    expect(supportedCapabilities).toHaveLength(1);
    expect(supportedCapabilities[0].id).toBe('test-capability');
  });
  
  it('should sort capabilities by priority (highest first)', () => {
    const lowPriorityCapability = createMockCapability({
      id: 'low-priority',
      name: 'Low Priority',
      priority: 100
    });
    
    const mediumPriorityCapability = createMockCapability({
      id: 'medium-priority',
      name: 'Medium Priority',
      priority: 200
    });
    
    const highPriorityCapability = createMockCapability({
      id: 'high-priority',
      name: 'High Priority',
      priority: 300
    });
    
    // Register in random order
    capabilityRegistry.registerCapability(mediumPriorityCapability);
    capabilityRegistry.registerCapability(lowPriorityCapability);
    capabilityRegistry.registerCapability(highPriorityCapability);
    
    const capabilities = capabilityRegistry.getSupportedCapabilities('openai', 'gpt-4o');
    
    // Should be sorted by priority (highest first)
    expect(capabilities[0].id).toBe('high-priority');
    expect(capabilities[1].id).toBe('medium-priority');
    expect(capabilities[2].id).toBe('low-priority');
  });
  
  it('should filter capabilities by provider support', () => {
    const openaiCapability = createMockCapability({
      id: 'openai-only',
      name: 'OpenAI Only',
      isSupported: (provider) => provider === 'openai'
    });
    
    const anthropicCapability = createMockCapability({
      id: 'anthropic-only',
      name: 'Anthropic Only',
      isSupported: (provider) => provider === 'anthropic'
    });
    
    capabilityRegistry.registerCapability(openaiCapability);
    capabilityRegistry.registerCapability(anthropicCapability);
    
    const openaiCapabilities = capabilityRegistry.getSupportedCapabilities('openai', 'gpt-4o');
    expect(openaiCapabilities).toHaveLength(1);
    expect(openaiCapabilities[0].id).toBe('openai-only');
    
    const anthropicCapabilities = capabilityRegistry.getSupportedCapabilities('anthropic', 'claude-3');
    expect(anthropicCapabilities).toHaveLength(1);
    expect(anthropicCapabilities[0].id).toBe('anthropic-only');
  });
  
  it('should check if a specific capability is supported', () => {
    const mockCapability = createMockCapability({
      id: 'test-capability',
      isSupported: (provider) => provider === 'openai'
    });
    
    capabilityRegistry.registerCapability(mockCapability);
    
    expect(capabilityRegistry.isCapabilitySupported('test-capability', 'openai', 'gpt-4o')).toBe(true);
    expect(capabilityRegistry.isCapabilitySupported('test-capability', 'anthropic', 'claude-3')).toBe(false);
    expect(capabilityRegistry.isCapabilitySupported('non-existent', 'openai', 'gpt-4o')).toBe(false);
  });
  
  it('should apply request middleware in priority order', () => {
    const highPriorityCapability = createMockCapability({
      id: 'high-priority',
      priority: 300,
      formatRequestMiddleware: (req) => ({ ...req, high: true })
    });
    
    const mediumPriorityCapability = createMockCapability({
      id: 'medium-priority',
      priority: 200,
      formatRequestMiddleware: (req) => ({ ...req, medium: true })
    });
    
    const lowPriorityCapability = createMockCapability({
      id: 'low-priority',
      priority: 100,
      formatRequestMiddleware: (req) => ({ ...req, low: true })
    });
    
    // Register in random order
    capabilityRegistry.registerCapability(mediumPriorityCapability);
    capabilityRegistry.registerCapability(lowPriorityCapability);
    capabilityRegistry.registerCapability(highPriorityCapability);
    
    const request = { model: 'test' };
    const context = { provider: 'openai', model: 'gpt-4o', modelConfig: {} as any };
    
    const result = capabilityRegistry.applyRequestMiddleware(request, context);
    
    // All middleware should be applied
    expect(result).toEqual(expect.objectContaining({
      model: 'test',
      high: true,
      medium: true,
      low: true
    }));
    
    // Order of operations can be verified by modifying the same property
    const orderTestCapability1 = createMockCapability({
      id: 'order-test-1',
      priority: 300,
      formatRequestMiddleware: (req) => ({ ...req, order: 'high' })
    });
    
    const orderTestCapability2 = createMockCapability({
      id: 'order-test-2',
      priority: 200,
      formatRequestMiddleware: (req) => ({ ...req, order: 'medium' })
    });
    
    const orderTestCapability3 = createMockCapability({
      id: 'order-test-3',
      priority: 100,
      formatRequestMiddleware: (req) => ({ ...req, order: 'low' })
    });
    
    clearMockCapabilities();
    capabilityRegistry.registerCapability(orderTestCapability1);
    capabilityRegistry.registerCapability(orderTestCapability2);
    capabilityRegistry.registerCapability(orderTestCapability3);
    
    const orderResult = capabilityRegistry.applyRequestMiddleware(request, context);
    
    // The last applied middleware (lowest priority) should win
    expect(orderResult.order).toBe('low');
  });
  
  it('should apply response middleware in priority order', () => {
    const highPriorityCapability = createMockCapability({
      id: 'high-priority',
      priority: 300,
      parseResponseMiddleware: (res) => ({ ...res, high: true })
    });
    
    const mediumPriorityCapability = createMockCapability({
      id: 'medium-priority',
      priority: 200,
      parseResponseMiddleware: (res) => ({ ...res, medium: true })
    });
    
    const lowPriorityCapability = createMockCapability({
      id: 'low-priority',
      priority: 100,
      parseResponseMiddleware: (res) => ({ ...res, low: true })
    });
    
    // Register in random order
    capabilityRegistry.registerCapability(mediumPriorityCapability);
    capabilityRegistry.registerCapability(lowPriorityCapability);
    capabilityRegistry.registerCapability(highPriorityCapability);
    
    const response = { content: 'test' };
    const context = { provider: 'openai', model: 'gpt-4o', modelConfig: {} as any };
    
    const result = capabilityRegistry.applyResponseMiddleware(response, context);
    
    // All middleware should be applied
    expect(result).toEqual(expect.objectContaining({
      content: 'test',
      high: true,
      medium: true,
      low: true
    }));
  });
  
  it('should handle missing middleware gracefully', () => {
    const noMiddlewareCapability = createMockCapability({
      id: 'no-middleware',
      formatRequestMiddleware: undefined,
      parseResponseMiddleware: undefined
    });
    
    capabilityRegistry.registerCapability(noMiddlewareCapability);
    
    const request = { model: 'test' };
    const response = { content: 'test' };
    const context = { provider: 'openai', model: 'gpt-4o', modelConfig: {} as any };
    
    // Should not throw errors
    const requestResult = capabilityRegistry.applyRequestMiddleware(request, context);
    const responseResult = capabilityRegistry.applyResponseMiddleware(response, context);
    
    // Should return the original objects unchanged
    expect(requestResult).toEqual(request);
    expect(responseResult).toEqual(response);
  });
  
  it('should create capability context correctly', () => {
    const provider = 'openai';
    const model = 'gpt-4o';
    const modelConfig = { temperature: 0.7 };
    
    const context = capabilityRegistry.createContext(provider, model, modelConfig as any);
    
    expect(context).toEqual({
      provider,
      model,
      modelConfig
    });
  });
  
  it('should check built-in capabilities correctly', () => {
    // Mock the provider and model registries
    vi.mock('@config/providers/provider.registry', () => ({
      ProviderRegistry: {
        getProviderCapabilities: vi.fn().mockImplementation((provider) => {
          if (provider === 'openai') {
            return {
              supportsThinking: false,
              supportsStreaming: true,
              supportsSystemPrompt: true
            };
          } else if (provider === 'anthropic') {
            return {
              supportsThinking: true,
              supportsStreaming: true,
              supportsSystemPrompt: false
            };
          }
          return {};
        })
      }
    }));
    
    vi.mock('@config/models/model.registry', () => ({
      ModelRegistry: {
        getModelCapabilities: vi.fn().mockImplementation((model) => {
          if (model === 'gpt-4o') {
            return {
              supportsThinking: false
            };
          } else if (model === 'claude-3-7-sonnet-20250219') {
            return {
              supportsThinking: true
            };
          }
          return {};
        })
      }
    }));
    
    // Test built-in capability checks
    expect(capabilityRegistry.hasCapability('thinking', 'anthropic', 'claude-3-7-sonnet-20250219')).toBe(true);
    expect(capabilityRegistry.hasCapability('thinking', 'openai', 'gpt-4o')).toBe(false);
    expect(capabilityRegistry.hasCapability('streaming', 'openai', 'gpt-4o')).toBe(true);
    expect(capabilityRegistry.hasCapability('systemPrompt', 'openai', 'gpt-4o')).toBe(true);
    expect(capabilityRegistry.hasCapability('systemPrompt', 'anthropic', 'claude-3-7-sonnet-20250219')).toBe(false);
  });
});