import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Provider } from 'react-redux';
import App from '@components/App';
import { capabilityRegistry } from '../registry';
import { ThinkingModeCapability } from '../thinking-mode.capability';
import { createTestStore } from '../../test/test-utils';
import { ChatSubmissionService } from '@services/ChatSubmissionService';

// Mock the ChatSubmissionService
vi.mock('@services/ChatSubmissionService', () => ({
  ChatSubmissionService: vi.fn().mockImplementation(() => ({
    submitChatCompletion: vi.fn().mockImplementation((config, messages) => {
      // Simulate different responses based on thinking mode
      if (config.modelConfig.capabilities?.thinking_mode?.enabled) {
        return Promise.resolve({
          content: "After careful consideration, I think the answer is 42.",
          thinking: "Let me analyze this step by step..."
        });
      } else {
        return Promise.resolve({
          content: "The answer is 42."
        });
      }
    }),
    submitStreamingChatCompletion: vi.fn().mockImplementation(() => {
      // Return a mock readable stream
      return new ReadableStream({
        start(controller) {
          controller.enqueue({ content: "The answer " });
          controller.enqueue({ content: "is 42." });
          controller.close();
        }
      });
    })
  }))
}));

describe('Capability End-to-End Scenarios', () => {
  beforeEach(() => {
    // Reset mocks and registry
    vi.resetAllMocks();
    localStorage.clear();
    
    // Register test capabilities
    capabilityRegistry.registerCapability(ThinkingModeCapability);
  });
  
  it('should complete full user journey with thinking mode capability', async () => {
    // Create store with empty chat history
    const store = createTestStore();
    
    render(
      <Provider store={store}>
        <App />
      </Provider>
    );
    
    // Step 1: Create a new chat
    const newChatButton = screen.getByRole('button', { name: /new chat/i });
    fireEvent.click(newChatButton);
    
    // Step 2: Open config menu
    const configButton = screen.getByRole('button', { name: /settings/i });
    fireEvent.click(configButton);
    
    // Step 3: Enable thinking mode
    const thinkingModeToggle = screen.getByRole('switch', { name: /thinking mode/i });
    fireEvent.click(thinkingModeToggle);
    
    // Step 4: Close config menu
    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);
    
    // Step 5: Type a message
    const inputField = screen.getByRole('textbox');
    fireEvent.change(inputField, { target: { value: 'What is the meaning of life?' } });
    
    // Step 6: Submit the message
    const submitButton = screen.getByRole('button', { name: /send/i });
    fireEvent.click(submitButton);
    
    // Step 7: Verify thinking mode was used in the response
    await waitFor(() => {
      // Check for thinking mode indicator in UI
      expect(screen.getByText(/thinking/i)).toBeInTheDocument();
      
      // Check for the enhanced response that used thinking
      expect(screen.getByText(/after careful consideration/i)).toBeInTheDocument();
    });
    
    // Verify the service was called with thinking mode enabled
    const submissionService = ChatSubmissionService.mock.instances[0];
    const lastCall = submissionService.submitChatCompletion.mock.calls[0];
    expect(lastCall[0].modelConfig.capabilities.thinking_mode.enabled).toBe(true);
  });
  
  it('should handle model switching with capability support changes', async () => {
    // Create store with empty chat history
    const store = createTestStore();
    
    render(
      <Provider store={store}>
        <App />
      </Provider>
    );
    
    // Create a new chat
    const newChatButton = screen.getByRole('button', { name: /new chat/i });
    fireEvent.click(newChatButton);
    
    // Open config menu
    const configButton = screen.getByRole('button', { name: /settings/i });
    fireEvent.click(configButton);
    
    // Verify thinking mode is available for default model
    expect(screen.getByRole('switch', { name: /thinking mode/i })).toBeInTheDocument();
    
    // Change to a model that doesn't support thinking mode
    const modelSelector = screen.getByRole('combobox', { name: /model/i });
    fireEvent.change(modelSelector, { target: { value: 'basic-model' } });
    
    // Verify thinking mode toggle is no longer shown
    expect(screen.queryByRole('switch', { name: /thinking mode/i })).not.toBeInTheDocument();
    
    // Change back to a model that supports thinking mode
    fireEvent.change(modelSelector, { target: { value: 'gpt-4o' } });
    
    // Verify thinking mode toggle is shown again
    expect(screen.getByRole('switch', { name: /thinking mode/i })).toBeInTheDocument();
  });
});