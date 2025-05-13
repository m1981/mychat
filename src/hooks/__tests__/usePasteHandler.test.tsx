import { renderHook } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

import { usePasteHandler } from '../usePasteHandler';

describe('usePasteHandler', () => {
  // Mock the onContentUpdate callback
  const mockOnContentUpdate = vi.fn();
  
  // Mock clipboard event with proper dispatchEvent implementation
  const createClipboardEvent = (content: string) => {
    return {
      preventDefault: vi.fn(),
      clipboardData: {
        getData: vi.fn().mockReturnValue(content)
      },
      currentTarget: {
        value: 'initial text',
        selectionStart: 7,
        selectionEnd: 7,
        setSelectionRange: vi.fn(),
        dispatchEvent: vi.fn()
      },
      dispatchEvent: vi.fn()
    } as unknown as React.ClipboardEvent<HTMLTextAreaElement>;
  };
  
  beforeEach(() => {
    vi.resetAllMocks();
    
    // Mock document.execCommand
    document.execCommand = vi.fn().mockReturnValue(false);
    
    // Mock Event constructor
    global.Event = vi.fn(() => ({})) as any;
  });
  
  it('should handle paste with execCommand when available', () => {
    // Mock execCommand to return true (success)
    document.execCommand = vi.fn().mockReturnValue(true);
    
    const { result } = renderHook(() => usePasteHandler({ onContentUpdate: mockOnContentUpdate }));
    
    // Create mock event with textarea that will have value updated by execCommand
    const mockEvent = createClipboardEvent('pasted content');
    mockEvent.currentTarget.value = 'initial pasted content text'; // Simulate execCommand updating the value
    
    // Call the handlePaste function
    result.current.handlePaste(mockEvent);
    
    // Verify execCommand was called
    expect(document.execCommand).toHaveBeenCalledWith('insertText', false, 'pasted content');
    
    // Verify preventDefault was called
    expect(mockEvent.preventDefault).toHaveBeenCalled();
    
    // Verify onContentUpdate was called with the updated content
    expect(mockOnContentUpdate).toHaveBeenCalledWith('initial pasted content text');
    
    // Verify input event was dispatched
    expect(mockEvent.currentTarget.dispatchEvent).toHaveBeenCalled();
    expect(global.Event).toHaveBeenCalledWith('input', { bubbles: true });
  });
  
  it('should handle paste with manual update when execCommand is not available', () => {
    // Mock execCommand to return false (failure)
    document.execCommand = vi.fn().mockReturnValue(false);
    
    const { result } = renderHook(() => usePasteHandler({ onContentUpdate: mockOnContentUpdate }));
    
    // Create mock event
    const mockEvent = createClipboardEvent('pasted content');
    
    // Call the handlePaste function
    result.current.handlePaste(mockEvent);
    
    // Verify execCommand was called but failed
    expect(document.execCommand).toHaveBeenCalledWith('insertText', false, 'pasted content');
    
    // Verify preventDefault was called
    expect(mockEvent.preventDefault).toHaveBeenCalled();
    
    // Verify textarea value was manually updated
    expect(mockEvent.currentTarget.value).toBe('initialpasted content text');
    
    // Verify cursor position was updated
    // The new position should be: start (7) + pastedContent.length (14) = 21
    expect(mockEvent.currentTarget.setSelectionRange).toHaveBeenCalledWith(21, 21);
    
    // Verify onContentUpdate was called with the updated content
    expect(mockOnContentUpdate).toHaveBeenCalledWith('initialpasted content text');
    
    // Verify input event was dispatched
    expect(mockEvent.currentTarget.dispatchEvent).toHaveBeenCalled();
    expect(global.Event).toHaveBeenCalledWith('input', { bubbles: true });
  });
});