import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import EditViewButtons from '../EditViewButtons';
import { MessageEditorProvider } from '@components/Chat/ChatContent/Message/context/MessageEditorContext';

describe('EditViewButtons', () => {
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
        <EditViewButtons />
      </MessageEditorProvider>
    );
  };

  it('renders Save button', () => {
    renderWithProvider();
    
    expect(screen.getByTestId('save-edit-button')).toHaveTextContent('Save');
  });

  it('renders Cancel button when not in composer mode', () => {
    renderWithProvider({ isComposer: false });
    
    expect(screen.getByTestId('cancel-edit-button')).toHaveTextContent('Cancel');
  });

  it('does not render Cancel button in composer mode', () => {
    renderWithProvider({ isComposer: true });
    
    expect(screen.queryByTestId('cancel-edit-button')).not.toBeInTheDocument();
  });

  it('renders Save & Submit button in composer mode', () => {
    renderWithProvider({ isComposer: true });
    
    expect(screen.getByTestId('save-submit-button')).toHaveTextContent('Save & Submit');
  });

  it('does not render Save & Submit button when not in composer mode', () => {
    renderWithProvider({ isComposer: false });
    
    expect(screen.queryByTestId('save-submit-button')).not.toBeInTheDocument();
  });

  it('calls setIsEdit when Cancel button is clicked', () => {
    const setIsEdit = vi.fn();
    renderWithProvider({ setIsEdit });
    
    fireEvent.click(screen.getByTestId('cancel-edit-button'));
    
    expect(setIsEdit).toHaveBeenCalledWith(false);
  });

  it('calls handleSave when Save button is clicked', () => {
    const mockHandleSave = vi.fn();
    
    // Create a mock implementation of MessageEditorContext
    vi.mock('@components/Chat/ChatContent/Message/context/MessageEditorContext', () => ({
      useMessageEditorContext: () => ({
        handleSave: mockHandleSave,
        setIsEdit: vi.fn(),
        isComposer: false,
        handleSaveAndSubmit: vi.fn(),
      }),
      MessageEditorProvider: ({ children }) => children,
    }));
    
    // Re-render after mocking
    render(<EditViewButtons />);
    
    fireEvent.click(screen.getByTestId('save-edit-button'));
    
    expect(mockHandleSave).toHaveBeenCalled();
  });

  it('calls customSaveHandler when provided and Save button is clicked', () => {
    const customSaveHandler = vi.fn();
    const mockHandleSave = vi.fn();
    
    // Create a mock implementation of MessageEditorContext
    vi.mock('@components/Chat/ChatContent/Message/context/MessageEditorContext', () => ({
      useMessageEditorContext: () => ({
        handleSave: mockHandleSave,
        setIsEdit: vi.fn(),
        isComposer: false,
        handleSaveAndSubmit: vi.fn(),
      }),
      MessageEditorProvider: ({ children }) => children,
    }), { virtual: true });
    
    render(<EditViewButtons customSaveHandler={customSaveHandler} />);
    
    fireEvent.click(screen.getByTestId('save-edit-button'));
    
    expect(customSaveHandler).toHaveBeenCalled();
    expect(mockHandleSave).not.toHaveBeenCalled();
  });
});