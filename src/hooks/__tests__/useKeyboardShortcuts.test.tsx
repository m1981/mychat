import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useKeyboardShortcuts } from '../useKeyboardShortcuts';
import { useMessageEditorContext } from '@components/Chat/ChatContent/Message/context/MessageEditorContext';
import { useStore } from '@store/store';

// Mock the dependencies
vi.mock('@components/Chat/ChatContent/Message/context/MessageEditorContext', () => ({
  useMessageEditorContext: vi.fn()
}));

vi.mock('@store/store', () => ({
  useStore: {
    getState: vi.fn()
  }
}));

describe('useKeyboardShortcuts', () => {
  // Mock context values
  const mockSetIsEdit = vi.fn();
  const mockHandleSave = vi.fn();
  const mockHandleSaveAndSubmit = vi.fn();
  const mockResetTextAreaHeight = vi.fn();
  
  // Mock event
  const createKeyboardEvent = (key: string, ctrlKey = false, shiftKey = false) => {
    return {
      key,
      ctrlKey,
      shiftKey,
      preventDefault: vi.fn(),
      nativeEvent: { isComposing: false }
    } as unknown as React.KeyboardEvent<HTMLTextAreaElement>;
  };
  
  beforeEach(() => {
    vi.resetAllMocks();
    
    // Setup mock context
    (useMessageEditorContext as jest.Mock).mockReturnValue({
      isComposer: false,
      setIsEdit: mockSetIsEdit,
      handleSave: mockHandleSave,
      handleSaveAndSubmit: mockHandleSaveAndSubmit,
      resetTextAreaHeight: mockResetTextAreaHeight
    });
    
    // Setup mock store
    (useStore.getState as jest.Mock).mockReturnValue({
      enterToSubmit: true
    });
    
    // Mock document event listeners
    vi.spyOn(document, 'addEventListener').mockImplementation(() => {});
    vi.spyOn(document, 'removeEventListener').mockImplementation(() => {});
  });
  
  it('should handle Escape key to exit edit mode (non-composer)', () => {
    const { result } = renderHook(() => useKeyboardShortcuts());
    
    // Simulate Escape key press
    act(() => {
      const event = createKeyboardEvent('Escape');
      result.current.handleKeyDown(event);
    });
    
    expect(mockSetIsEdit).toHaveBeenCalledWith(false);
  });
  
  it('should handle Ctrl+Shift+Enter to save and submit (non-composer)', () => {
    const { result } = renderHook(() => useKeyboardShortcuts());
    
    // Simulate Ctrl+Shift+Enter key press
    act(() => {
      const event = createKeyboardEvent('Enter', true, true);
      result.current.handleKeyDown(event);
    });
    
    expect(mockHandleSaveAndSubmit).toHaveBeenCalled();
    expect(mockResetTextAreaHeight).toHaveBeenCalled();
  });
  
  it('should handle Ctrl+Enter or Shift+Enter to save (non-composer)', () => {
    const { result } = renderHook(() => useKeyboardShortcuts());
    
    // Simulate Ctrl+Enter key press
    act(() => {
      const event = createKeyboardEvent('Enter', true, false);
      result.current.handleKeyDown(event);
    });
    
    expect(mockHandleSave).toHaveBeenCalled();
    
    // Reset mocks
    mockHandleSave.mockReset();
    
    // Simulate Shift+Enter key press
    act(() => {
      const event = createKeyboardEvent('Enter', false, true);
      result.current.handleKeyDown(event);
    });
    
    expect(mockHandleSave).toHaveBeenCalled();
  });
  
  it('should handle Enter to submit when enterToSubmit is true (composer)', () => {
    // Change context to composer mode
    (useMessageEditorContext as jest.Mock).mockReturnValue({
      isComposer: true,
      setIsEdit: mockSetIsEdit,
      handleSave: mockHandleSave,
      handleSaveAndSubmit: mockHandleSaveAndSubmit,
      resetTextAreaHeight: mockResetTextAreaHeight
    });
    
    const { result } = renderHook(() => useKeyboardShortcuts());
    
    // Simulate Enter key press
    act(() => {
      const event = createKeyboardEvent('Enter');
      result.current.handleKeyDown(event);
    });
    
    expect(mockHandleSaveAndSubmit).toHaveBeenCalled();
    expect(mockResetTextAreaHeight).toHaveBeenCalled();
  });
  
  it('should add and remove global event listener', () => {
    // Render the hook and get the unmount function
    const { unmount } = renderHook(() => useKeyboardShortcuts());
    
    // Verify that addEventListener was called
    expect(document.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
    
    // Unmount to trigger the cleanup function
    unmount();
    
    // Verify that removeEventListener was called
    expect(document.removeEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
  });
});