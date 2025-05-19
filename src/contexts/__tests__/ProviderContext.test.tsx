import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProviderProvider, useProvider } from '@contexts/ProviderContext';
import React from 'react';

// Mock provider registry
vi.mock('@config/providers/provider.registry', () => ({
  ProviderRegistry: {
    getProviderImplementation: vi.fn().mockImplementation((key) => {
      if (key === 'openai') {
        return {
          id: 'openai',
          formatRequest: vi.fn(),
          parseResponse: vi.fn(),
          submitCompletion: vi.fn(),
          submitStream: vi.fn()
        };
      }
      if (key === 'anthropic') {
        return {
          id: 'anthropic',
          formatRequest: vi.fn(),
          parseResponse: vi.fn(),
          submitCompletion: vi.fn(),
          submitStream: vi.fn()
        };
      }
      return null;
    }),
    getProvider: vi.fn().mockImplementation((key) => {
      if (key === 'openai') {
        return {
          id: 'openai',
          name: 'OpenAI',
          defaultModel: 'gpt-4o',
          endpoints: ['chat/openai'],
          models: [
            {
              id: 'gpt-4o',
              name: 'GPT-4o',
              maxCompletionTokens: 16384,
              cost: {
                input: { price: 0.0025, unit: 1000 },
                output: { price: 0.01, unit: 1000 }
              }
            }
          ]
        };
      }
      if (key === 'anthropic') {
        return {
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
            }
          ]
        };
      }
      return null;
    })
  }
}));

// Mock model registry
vi.mock('@config/models/model.registry', () => ({
  ModelRegistry: {
    getModelCapabilities: vi.fn().mockReturnValue({
      modelId: 'claude-3-7-sonnet-20250219',
      provider: 'anthropic',
      maxResponseTokens: 8192,
      defaultResponseTokens: 4096,
      supportsThinking: true,
      defaultThinkingBudget: 16000
    })
  }
}));

// Test component that uses the provider context
const TestComponent = () => {
  const provider = useProvider();
  return <div data-testid="provider-id">{provider.id}</div>;
};

describe('ProviderContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  it('should provide OpenAI provider when specified', () => {
    render(
      <ProviderProvider providerKey="openai">
        <TestComponent />
      </ProviderProvider>
    );
    
    expect(screen.getByTestId('provider-id')).toHaveTextContent('openai');
  });
  
  it('should provide Anthropic provider when specified', () => {
    render(
      <ProviderProvider providerKey="anthropic">
        <TestComponent />
      </ProviderProvider>
    );
    
    expect(screen.getByTestId('provider-id')).toHaveTextContent('anthropic');
  });
  
  it('should throw error when useProvider is used outside ProviderProvider', () => {
    // Suppress console errors for this test
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    // Expect render to throw
    expect(() => {
      render(<TestComponent />);
    }).toThrow('useProvider must be used within a ProviderProvider');
    
    consoleErrorSpy.mockRestore();
  });
  
  it('should pass provider to nested components', () => {
    render(
      <ProviderProvider providerKey="openai">
        <div>
          <div>
            <TestComponent />
          </div>
        </div>
      </ProviderProvider>
    );
    
    expect(screen.getByTestId('provider-id')).toHaveTextContent('openai');
  });
});