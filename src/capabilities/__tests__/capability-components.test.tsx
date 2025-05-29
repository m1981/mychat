import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Provider } from 'react-redux';
import ConfigMenu from '@components/ConfigMenu/ConfigMenu';
import { capabilityRegistry } from '../registry';
import { ThinkingModeCapability } from '../thinking-mode.capability';
import { createTestStore } from '../../test/test-utils';

// Mock store with initial state
const mockStore = createTestStore({
  chats: [{
    id: 'test-chat-1',
    title: 'Test Chat',
    messages: [],
    config: {
      provider: 'openai',
      modelConfig: {
        model: 'gpt-4o',
        temperature: 0.7,
        capabilities: {
          thinking_mode: {
            enabled: false,
            budget_tokens: 16000
          }
        }
      }
    }
  }],
  currentChatIndex: 0
});

describe('Capability Components Integration', () => {
  beforeEach(() => {
    // Reset registry and register test capabilities
    vi.resetAllMocks();
    capabilityRegistry.registerCapability(ThinkingModeCapability);
  });
  
  it('should render capability components in ConfigMenu', () => {
    render(
      <Provider store={mockStore}>
        <ConfigMenu chatId="test-chat-1" isOpen={true} onClose={() => {}} />
      </Provider>
    );
    
    // Verify thinking mode toggle is rendered
    expect(screen.getByText(/thinking mode/i)).toBeInTheDocument();
  });
  
  it('should update store when capability config changes', () => {
    render(
      <Provider store={mockStore}>
        <ConfigMenu chatId="test-chat-1" isOpen={true} onClose={() => {}} />
      </Provider>
    );
    
    // Find and toggle thinking mode
    const toggle = screen.getByRole('switch', { name: /thinking mode/i });
    fireEvent.click(toggle);
    
    // Verify store was updated
    const state = mockStore.getState();
    const chatConfig = state.chats[0].config;
    expect(chatConfig.modelConfig.capabilities.thinking_mode.enabled).toBe(true);
  });
  
  it('should show/hide capability components based on provider support', () => {
    // Update store to use a provider that doesn't support thinking mode
    mockStore.dispatch({
      type: 'chat/updateChatConfig',
      payload: {
        chatId: 'test-chat-1',
        config: {
          provider: 'unsupported-provider',
          modelConfig: { model: 'basic-model' }
        }
      }
    });
    
    render(
      <Provider store={mockStore}>
        <ConfigMenu chatId="test-chat-1" isOpen={true} onClose={() => {}} />
      </Provider>
    );
    
    // Verify thinking mode toggle is not rendered
    expect(screen.queryByText(/thinking mode/i)).not.toBeInTheDocument();
  });
});