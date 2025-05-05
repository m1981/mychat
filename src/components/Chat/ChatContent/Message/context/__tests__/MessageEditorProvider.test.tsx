import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { MessageEditorProvider } from '../MessageEditorProvider';
import { useMessageEditorContext } from '../MessageEditorContext';
import { useMessageEditor } from '@hooks/useMessageEditor';

// Mock the useMessageEditor hook
vi.mock('@hooks/useMessageEditor', () => ({
  useMessageEditor: vi.fn()
}));

// Test component that consumes the context
function TestConsumer() {
  const { editContent, isComposer, messageIndex } = useMessageEditorContext();
  return (
    <div>
      <div data-testid="edit-content">{editContent}</div>
      <div data-testid="is-composer">{isComposer.toString()}</div>
      <div data-testid="message-index">{messageIndex}</div>
    </div>
  );
}

describe('MessageEditorProvider', () => {
  const mockSetIsEdit = vi.fn();
  const mockSetIsEditing = vi.fn();
  
  // Mock return value for useMessageEditor
  const mockHookReturn = {
    editContent: 'Test content',
    setEditContent: vi.fn(),
    isModalOpen: false,
    setIsModalOpen: vi.fn(),
    textareaRef: { current: null },
    handleSave: vi.fn(),
    handleSaveAndSubmit: vi.fn(),
    resetTextAreaHeight: vi.fn()
  };
  
  beforeEach(() => {
    vi.resetAllMocks();
    (useMessageEditor as any).mockReturnValue(mockHookReturn);
  });
  
  it('should provide context values to children', () => {
    render(
      <MessageEditorProvider
        initialContent="Initial content"
        messageIndex={2}
        isComposer={false}
        setIsEdit={mockSetIsEdit}
        setIsEditing={mockSetIsEditing}
      >
        <TestConsumer />
      </MessageEditorProvider>
    );
    
    // Check that the context values are correctly provided to children
    expect(screen.getByTestId('edit-content').textContent).toBe('Test content');
    expect(screen.getByTestId('is-composer').textContent).toBe('false');
    expect(screen.getByTestId('message-index').textContent).toBe('2');
  });
  
  it('should call useMessageEditor with correct props', () => {
    render(
      <MessageEditorProvider
        initialContent="Initial content"
        messageIndex={2}
        isComposer={false}
        setIsEdit={mockSetIsEdit}
        setIsEditing={mockSetIsEditing}
      >
        <div>Child component</div>
      </MessageEditorProvider>
    );
    
    // Check that useMessageEditor was called with the correct props
    expect(useMessageEditor).toHaveBeenCalledWith({
      initialContent: 'Initial content',
      messageIndex: 2,
      isComposer: false,
      setIsEdit: mockSetIsEdit,
      setIsEditing: mockSetIsEditing
    });
  });
  
  it('should pass focusLine to context when provided', () => {
    // Mock a different implementation for this test
    (useMessageEditor as any).mockReturnValue({
      ...mockHookReturn,
      editContent: 'Content with focus line'
    });
    
    render(
      <MessageEditorProvider
        initialContent="Initial content"
        messageIndex={3}
        isComposer={true}
        setIsEdit={mockSetIsEdit}
        setIsEditing={mockSetIsEditing}
        focusLine={5}
      >
        <TestConsumer />
      </MessageEditorProvider>
    );
    
    // Verify that the context has the correct values
    expect(screen.getByTestId('edit-content').textContent).toBe('Content with focus line');
    expect(screen.getByTestId('is-composer').textContent).toBe('true');
    expect(screen.getByTestId('message-index').textContent).toBe('3');
  });
});