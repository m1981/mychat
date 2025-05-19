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