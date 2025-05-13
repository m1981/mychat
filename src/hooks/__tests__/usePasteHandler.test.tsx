import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMockEvent } from '@utils/test-utils';

import { usePasteHandler } from '../usePasteHandler';

describe('usePasteHandler Hook', () => {
  const mockOnContentUpdate = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
    document.execCommand = vi.fn().mockReturnValue(true);
  });
  
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should handle text paste events', () => {
    const { result } = renderHook(() => 
      usePasteHandler({
        onContentUpdate: mockOnContentUpdate
      })
    );

    // Create mock textarea element
    const textarea = document.createElement('textarea');
    textarea.value = 'Initial text';
    textarea.selectionStart = 5;
    textarea.selectionEnd = 5;
    
    // Create mock paste event with text data
    const pasteEvent = createMockEvent({
      currentTarget: textarea,
      clipboardData: {
        getData: vi.fn().mockReturnValue('Pasted text')
      },
      preventDefault: vi.fn()
    }) as unknown as React.ClipboardEvent<HTMLTextAreaElement>;

    // Call the handlePaste function
    result.current.handlePaste(pasteEvent);
    
    // Verify preventDefault was called
    expect(pasteEvent.preventDefault).toHaveBeenCalled();
    
    // Verify execCommand was called
    expect(document.execCommand).toHaveBeenCalledWith('insertText', false, 'Pasted text');
    
    // Verify onContentUpdate was called with the updated content
    expect(mockOnContentUpdate).toHaveBeenCalled();
  });

  it('should use fallback method when execCommand fails', () => {
    // Mock execCommand to fail
    document.execCommand = vi.fn().mockReturnValue(false);
    
    const { result } = renderHook(() => 
      usePasteHandler({
        onContentUpdate: mockOnContentUpdate
      })
    );

    // Create mock textarea with selection
    const textarea = document.createElement('textarea');
    textarea.value = 'Initial text';
    textarea.selectionStart = 5;
    textarea.selectionEnd = 5;
    
    // Create mock paste event
    const pasteEvent = createMockEvent({
      currentTarget: textarea,
      clipboardData: {
        getData: vi.fn().mockReturnValue('Pasted text')
      },
      preventDefault: vi.fn()
    }) as unknown as React.ClipboardEvent<HTMLTextAreaElement>;

    // Call the handlePaste function
    result.current.handlePaste(pasteEvent);
    
    // Verify preventDefault was called
    expect(pasteEvent.preventDefault).toHaveBeenCalled();
    
    // Verify execCommand was called but failed
    expect(document.execCommand).toHaveBeenCalledWith('insertText', false, 'Pasted text');
    
    // Verify fallback method updated the textarea value
    expect(textarea.value).toBe('InitiPasted textal text');
    
    // Verify onContentUpdate was called with the updated content
    expect(mockOnContentUpdate).toHaveBeenCalledWith('InitiPasted textal text');
  });

  it('should handle empty paste events', () => {
    const { result } = renderHook(() => 
      usePasteHandler({
        onContentUpdate: mockOnContentUpdate
      })
    );

    // Create mock textarea
    const textarea = document.createElement('textarea');
    textarea.value = 'Initial text';
    
    // Create mock paste event with empty text
    const pasteEvent = createMockEvent({
      currentTarget: textarea,
      clipboardData: {
        getData: vi.fn().mockReturnValue('')
      },
      preventDefault: vi.fn()
    }) as unknown as React.ClipboardEvent<HTMLTextAreaElement>;

    // Call the handlePaste function
    result.current.handlePaste(pasteEvent);
    
    // Verify execCommand was called with empty string
    expect(document.execCommand).toHaveBeenCalledWith('insertText', false, '');
    
    // Verify onContentUpdate was called
    expect(mockOnContentUpdate).toHaveBeenCalled();
  });

  it('should dispatch input event after paste', () => {
    const { result } = renderHook(() => 
      usePasteHandler({
        onContentUpdate: mockOnContentUpdate
      })
    );

    // Create mock textarea with dispatchEvent spy
    const textarea = document.createElement('textarea');
    textarea.value = 'Initial text';
    textarea.dispatchEvent = vi.fn();
    
    // Create mock paste event
    const pasteEvent = createMockEvent({
      currentTarget: textarea,
      clipboardData: {
        getData: vi.fn().mockReturnValue('Pasted text')
      },
      preventDefault: vi.fn()
    }) as unknown as React.ClipboardEvent<HTMLTextAreaElement>;

    // Call the handlePaste function
    result.current.handlePaste(pasteEvent);
    
    // Verify input event was dispatched
    expect(textarea.dispatchEvent).toHaveBeenCalled();
    const dispatchedEvent = vi.mocked(textarea.dispatchEvent).mock.calls[0][0];
    expect(dispatchedEvent.type).toBe('input');
    expect(dispatchedEvent.bubbles).toBe(true);
  });
});