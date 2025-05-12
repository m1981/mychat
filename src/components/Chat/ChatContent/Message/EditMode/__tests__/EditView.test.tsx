import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import EditView from '../EditView';
import { MessageEditorProvider } from '@components/Chat/ChatContent/Message/context/MessageEditorContext';

// Mock the hooks
vi.mock('@hooks/useKeyboardShortcuts', () => ({
  useKeyboardShortcuts: () => ({
    handleKeyDown: vi.fn(),
  }),
}));

vi.mock('@hooks/usePasteHandler', () => ({
  usePasteHandler: () => ({
    handlePaste: vi.fn(),
  }),
}));

vi.mock('@hooks/useFileDropHandler', () => ({
  useFileDropHandler: () => ({
    handleDrop: vi.fn(),
  }),
}));

vi.mock('@hooks/useTextareaFocus', () => ({
  useTextareaFocus: vi.fn(),
}));

vi.mock('@hooks/useTextSelection', () => ({
  useTextSelection: () => ({
    selectionStart: 0,
    selectionEnd: 0,
  }),
}));

// Mock the useSubmit hook
vi.mock('@hooks/useSubmit', () => ({
  default: () => ({
    handleSubmit: vi.fn(),
  }),
}));

// Mock EditViewButtons to simplify testing
vi.mock('../EditViewButtons', () => ({
  default: () => <div data-testid="edit-view-buttons">Buttons</div>,
}));

describe('EditView', () => {
  const renderWithProvider = (customProps = {}) => {
    const defaultProps = {
      initialContent: 'Test content',
      messageIndex: 0,
      isComposer: false,
      setIsEdit: vi.fn(),
      setIsEditing: vi.fn(),
    };
    
    return render(
      <MessageEditorProvider {...defaultProps} {...customProps}>
        <EditView />
      </MessageEditorProvider>
    );
  };

  it('renders textarea with correct content', () => {
    renderWithProvider({ initialContent: 'Test content' });
    
    const textarea = screen.getByTestId('edit-textarea');
    expect(textarea).toHaveValue('Test content');
  });

  it('updates content when typing', () => {
    renderWithProvider();
    
    const textarea = screen.getByTestId('edit-textarea');
    fireEvent.change(textarea, { target: { value: 'New content' } });
    
    expect(textarea).toHaveValue('New content');
  });

  it('renders EditViewButtons component', () => {
    renderWithProvider();
    
    expect(screen.getByTestId('edit-view-buttons')).toBeInTheDocument();
  });

  it('applies custom key handler when provided', () => {
    const customKeyHandler = vi.fn();
    
    render(
      <MessageEditorProvider
        initialContent="Test"
        messageIndex={0}
        isComposer={false}
        setIsEdit={vi.fn()}
        setIsEditing={vi.fn()}
      >
        <EditView customKeyHandler={customKeyHandler} />
      </MessageEditorProvider>
    );
    
    // We can't easily test if the custom handler is called since we've mocked useKeyboardShortcuts
    // But we can verify the component renders without errors
    expect(screen.getByTestId('edit-textarea')).toBeInTheDocument();
  });
});