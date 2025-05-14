
import { useMessageEditorContext } from '@components/Chat/ChatContent/Message/context/MessageEditorContext';
import { renderHook } from '@testing-library/react';
import { mockDocumentListeners } from '@utils/test-utils';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { useKeyboardShortcuts } from '../useKeyboardShortcuts';


// Mock dependencies
vi.mock('@components/Chat/ChatContent/Message/context/MessageEditorContext', () => {
  const mockHandleSave = vi.fn();
  const mockHandleSaveAndSubmit = vi.fn();
  const mockSetIsEdit = vi.fn();
  const mockResetTextAreaHeight = vi.fn();
  
  return {
    useMessageEditorContext: vi.fn().mockReturnValue({
      handleSave: mockHandleSave,
      handleSaveAndSubmit: mockHandleSaveAndSubmit,
      setIsEdit: mockSetIsEdit,
      resetTextAreaHeight: mockResetTextAreaHeight,
      isComposer: false
    })
  };
});

// Mock the store
vi.mock('@store/store', () => {
  const getStateMock = vi.fn().mockReturnValue({
    enterToSubmit: true
  });
  
  // Create a function with getState property
  const useStoreMock = Object.assign(
    vi.fn().mockImplementation((selector) => 
      selector({ enterToSubmit: true })
    ),
    { getState: getStateMock }
  );
  
  return {
    __esModule: true,
    default: useStoreMock
  };
});

describe('useKeyboardShortcuts', () => {
  let cleanupListeners: () => void;
  
  beforeEach(() => {
    cleanupListeners = mockDocumentListeners();
    vi.clearAllMocks();
  });
  
  afterEach(() => {
    cleanupListeners();
  });

  it('should register keyboard event handlers', () => {
    renderHook(() => useKeyboardShortcuts());
    expect(document.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
  });

  it('should clean up event listeners on unmount', () => {
    const { unmount } = renderHook(() => useKeyboardShortcuts());
    unmount();
    expect(document.removeEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
  });
  
  it('should handle keyboard shortcuts correctly', () => {
    // Get the mocked context
    const mockContext = useMessageEditorContext();
    
    // Render the hook to get the handleKeyDown function
    const { result } = renderHook(() => useKeyboardShortcuts());
    
    // Create a mock keyboard event
    const mockKeyEvent = {
      key: 'Enter',
      ctrlKey: true,
      shiftKey: true,
      metaKey: false,
      preventDefault: vi.fn(),
      nativeEvent: { isComposing: false }
    };
    
    // Call the handleKeyDown function directly with our mock event
    result.current.handleKeyDown(mockKeyEvent as any);
    
    // Verify preventDefault was called
    expect(mockKeyEvent.preventDefault).toHaveBeenCalled();
    
    // Verify the context function was called
    expect(mockContext.handleSaveAndSubmit).toHaveBeenCalled();
  });
  
  it('should handle Escape key to exit edit mode', () => {
    // Get the mocked context
    const mockContext = useMessageEditorContext();
    
    // Render the hook
    renderHook(() => useKeyboardShortcuts());
    
    // Get the global keydown handler
    const keydownHandler = vi.mocked(document.addEventListener).mock.calls[0][1] as EventListener;
    
    // Create a mock Escape key event
    const mockEscapeEvent = {
      key: 'Escape',
      preventDefault: vi.fn()
    };
    
    // Call the handler with the mock event
    keydownHandler(mockEscapeEvent as unknown as Event);
    
    // Verify preventDefault was called
    expect(mockEscapeEvent.preventDefault).toHaveBeenCalled();
    
    // Verify setIsEdit was called with false
    expect(mockContext.setIsEdit).toHaveBeenCalledWith(false);
  });
});