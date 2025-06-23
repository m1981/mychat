import React from 'react';
import { render, screen } from '@testing-library/react';
import { ProviderContext, ProviderProvider, useProvider } from '../ProviderContext';
import { mockAnthropicProvider, mockOpenAIProvider } from '../../test/mocks/providerRegistryMock';

// Mock the ProviderRegistry directly in vi.mock
vi.mock('@config/providers/provider.registry', () => {
  return {
    ProviderRegistry: {
      getProvider: vi.fn().mockImplementation((key) => {
        if (key === 'anthropic') return mockAnthropicProvider;
        if (key === 'openai') return mockOpenAIProvider;
        return mockAnthropicProvider; // Default fallback
      })
    }
  };
});

// Mock the store
vi.mock('@store/store', () => ({
  default: () => ({
    currentChatIndex: 0,
    chats: [
      {
        id: 'test-chat',
        config: {
          provider: 'anthropic',
          modelConfig: {
            model: 'claude-3-7-sonnet-20250219',
            max_tokens: 4096,
            temperature: 0.7,
            top_p: 1
          }
        }
      }
    ],
    apiKeys: {
      anthropic: 'test-key',
      openai: 'test-key'
    }
  })
}));

// Test component that uses the provider context
const TestComponent = () => {
  const provider = useProvider();
  return <div data-testid="provider-name">{provider.name}</div>;
};

describe('ProviderContext', () => {
  it('provides the correct provider based on providerKey prop', () => {
    render(
      <ProviderProvider providerKey="openai">
        <TestComponent />
      </ProviderProvider>
    );
    
    expect(screen.getByTestId('provider-name')).toHaveTextContent('OpenAI');
  });
  
  it('provides the default provider when no providerKey is specified', () => {
    render(
      <ProviderProvider>
        <TestComponent />
      </ProviderProvider>
    );
    
    expect(screen.getByTestId('provider-name')).toHaveTextContent('Anthropic');
  });
  
  it('throws an error when useProvider is used outside of ProviderProvider', () => {
    // Suppress console.error for this test
    const originalConsoleError = console.error;
    console.error = vi.fn();
    
    expect(() => {
      render(<TestComponent />);
    }).toThrow('useProvider must be used within a ProviderProvider');
    
    // Restore console.error
    console.error = originalConsoleError;
  });
});