import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import { MessageEditorContext, useMessageEditorContext } from '../MessageEditorContext';
import { MessageEditorContextType } from '../../interfaces';

// Test component that uses the context hook outside of a provider
function TestComponentWithoutProvider() {
  try {
    useMessageEditorContext();
    return <div>This should not render</div>;
  } catch (error) {
    return <div data-testid="error-message">{(error as Error).message}</div>;
  }
}

// Test component that uses the context hook within a provider
function TestComponentWithProvider() {
  const context = useMessageEditorContext();
  return <div data-testid="content-value">{context.editContent}</div>;
}

describe('MessageEditorContext', () => {
  it('should throw an error when used outside of a provider', () => {
    render(<TestComponentWithoutProvider />);
    
    const errorMessage = screen.getByTestId('error-message');
    expect(errorMessage.textContent).toBe(
      'useMessageEditorContext must be used within a MessageEditorProvider'
    );
  });

  it('should return the provided context value when used within a provider', () => {
    // Create a mock context value
    const mockContextValue: MessageEditorContextType = {
      editContent: 'Test content',
      isModalOpen: false,
      isEditing: true,
      setEditContent: vi.fn(),
      setIsModalOpen: vi.fn(),
      setIsEdit: vi.fn(),
      textareaRef: { current: null },
      handleSave: vi.fn(),
      handleSaveAndSubmit: vi.fn() as any, // Cast to any to handle Promise<void> return type
      resetTextAreaHeight: vi.fn(),
      messageIndex: 0,
      isComposer: false,
      focusLine: null
    };

    // Render the test component within a provider with the mock value
    render(
      <MessageEditorContext.Provider value={mockContextValue}>
        <TestComponentWithProvider />
      </MessageEditorContext.Provider>
    );
    
    const contentValue = screen.getByTestId('content-value');
    expect(contentValue.textContent).toBe('Test content');
  });
});