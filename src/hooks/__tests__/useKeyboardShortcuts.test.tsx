
import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, Mock } from 'vitest';
import { useKeyboardShortcuts } from '../useKeyboardShortcuts';
import { useMessageEditorContext } from '@components/Chat/ChatContent/Message/context/MessageEditorContext';
import useStore, { StoreState } from '@store/store'; // Import StoreState from store.ts

// Mock the dependencies
vi.mock('@components/Chat/ChatContent/Message/context/MessageEditorContext', () => ({
  useMessageEditorContext: vi.fn()
}));

vi.mock('@store/store', () => ({
  default: {
    getState: vi.fn()
  }
}));

// Helper function to get a properly typed mock function
function getMockFunction<T extends (...args: any[]) => any>(mock: any): Mock<T> {
  return mock as Mock<T>;
}

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
    const mockMessageEditorContext = getMockFunction<typeof useMessageEditorContext>(useMessageEditorContext);
    mockMessageEditorContext.mockReturnValue({
      isComposer: false,
      setIsEdit: mockSetIsEdit,
      handleSave: mockHandleSave,
      handleSaveAndSubmit: mockHandleSaveAndSubmit,
      resetTextAreaHeight: mockResetTextAreaHeight
    });
    
    // Setup mock store
    const mockGetState = getMockFunction<typeof useStore.getState>(useStore.getState);
    mockGetState.mockReturnValue({
      enterToSubmit: true
    } as Partial<StoreState> as StoreState);
    
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
    const mockMessageEditorContext = getMockFunction<typeof useMessageEditorContext>(useMessageEditorContext);
    mockMessageEditorContext.mockReturnValue({
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

  it('should handle global Escape key to exit edit mode (non-composer)', () => {
    // Render the hook
    renderHook(() => useKeyboardShortcuts());
    
    // Get the event handler that was registered
    const eventListenerCallback = ((document.addEventListener as unknown) as ReturnType<typeof vi.fn>).mock.calls[0][1];
    
    // Create a keyboard event
    const event = new KeyboardEvent('keydown', { key: 'Escape' });
    Object.defineProperty(event, 'preventDefault', { value: vi.fn() });
    
    // Call the event handler directly
    eventListenerCallback(event);
    
    // Verify that setIsEdit was called with false
    expect(mockSetIsEdit).toHaveBeenCalledWith(false);
    expect(event.preventDefault).toHaveBeenCalled();
  });

  it('should not exit edit mode on Escape if in composer mode', () => {
    // Change context to composer mode
    const mockMessageEditorContext = getMockFunction<typeof useMessageEditorContext>(useMessageEditorContext);
    mockMessageEditorContext.mockReturnValue({
      isComposer: true,
      setIsEdit: mockSetIsEdit,
      handleSave: mockHandleSave,
      handleSaveAndSubmit: mockHandleSaveAndSubmit,
      resetTextAreaHeight: mockResetTextAreaHeight
    });
    
    // Render the hook
    renderHook(() => useKeyboardShortcuts());
    
    // Get the event handler that was registered
    const eventListenerCallback = ((document.addEventListener as unknown) as ReturnType<typeof vi.fn>).mock.calls[0][1];
    
    // Create a keyboard event
    const event = new KeyboardEvent('keydown', { key: 'Escape' });
    Object.defineProperty(event, 'preventDefault', { value: vi.fn() });
    
    // Call the event handler directly
    eventListenerCallback(event);
    
    // Verify that setIsEdit was NOT called
    expect(mockSetIsEdit).not.toHaveBeenCalled();
    expect(event.preventDefault).not.toHaveBeenCalled();
  });
});