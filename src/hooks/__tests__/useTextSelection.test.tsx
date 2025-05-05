import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useTextSelection } from '../useTextSelection';

describe('useTextSelection', () => {
  // Mock window.getSelection
  let mockSelection: {
    toString: () => string;
    isCollapsed: boolean;
  };
  
  // Mock callback function
  const onCopyMock = vi.fn();
  
  beforeEach(() => {
    // Reset mocks
    vi.resetAllMocks();
    
    // Create a mock selection
    mockSelection = {
      toString: vi.fn().mockReturnValue(''),
      isCollapsed: true
    };
    
    // Mock window.getSelection
    vi.spyOn(window, 'getSelection').mockReturnValue(mockSelection as unknown as Selection);
    
    // Mock document event listeners
    vi.spyOn(document, 'addEventListener').mockImplementation(() => {});
    vi.spyOn(document, 'removeEventListener').mockImplementation(() => {});
    
    // Mock setTimeout
    vi.useFakeTimers();
  });
  
  afterEach(() => {
    // Restore real timers
    vi.useRealTimers();
  });
  
  it('should add mouseup event listener on mount', () => {
    renderHook(() => useTextSelection(onCopyMock));
    
    expect(document.addEventListener).toHaveBeenCalledWith('mouseup', expect.any(Function));
  });
  
  it('should remove mouseup event listener on unmount', () => {
    const { unmount } = renderHook(() => useTextSelection(onCopyMock));
    
    unmount();
    
    expect(document.removeEventListener).toHaveBeenCalledWith('mouseup', expect.any(Function));
  });
  
  it('should not call onCopy when no text is selected', () => {
    renderHook(() => useTextSelection(onCopyMock));
    
    // Get the mouseup handler
    const mouseupHandler = (document.addEventListener as jest.Mock).mock.calls[0][1];
    
    // Simulate mouseup event with no selection
    act(() => {
      mouseupHandler();
    });
    
    expect(onCopyMock).not.toHaveBeenCalled();
  });
  
  it('should not call onCopy when selection is collapsed', () => {
    // Set up collapsed selection
    mockSelection.isCollapsed = true;
    mockSelection.toString.mockReturnValue('some text');
    
    renderHook(() => useTextSelection(onCopyMock));
    
    // Get the mouseup handler
    const mouseupHandler = (document.addEventListener as jest.Mock).mock.calls[0][1];
    
    // Simulate mouseup event with collapsed selection
    act(() => {
      mouseupHandler();
    });
    
    expect(onCopyMock).not.toHaveBeenCalled();
  });
  
  it('should call onCopy when text is selected', () => {
    // Set up valid selection
    mockSelection.isCollapsed = false;
    mockSelection.toString.mockReturnValue('selected text');
    
    renderHook(() => useTextSelection(onCopyMock));
    
    // Get the mouseup handler
    const mouseupHandler = (document.addEventListener as jest.Mock).mock.calls[0][1];
    
    // Simulate mouseup event with valid selection
    act(() => {
      mouseupHandler();
    });
    
    expect(onCopyMock).toHaveBeenCalledWith('selected text');
  });
  
  it('should trim the selected text', () => {
    // Set up valid selection with whitespace
    mockSelection.isCollapsed = false;
    mockSelection.toString.mockReturnValue('  selected text with whitespace  ');
    
    renderHook(() => useTextSelection(onCopyMock));
    
    // Get the mouseup handler
    const mouseupHandler = (document.addEventListener as jest.Mock).mock.calls[0][1];
    
    // Simulate mouseup event with valid selection
    act(() => {
      mouseupHandler();
    });
    
    expect(onCopyMock).toHaveBeenCalledWith('selected text with whitespace');
  });
  
  it('should not call onCopy when selection is empty after trimming', () => {
    // Set up selection with only whitespace
    mockSelection.isCollapsed = false;
    mockSelection.toString.mockReturnValue('   ');
    
    renderHook(() => useTextSelection(onCopyMock));
    
    // Get the mouseup handler
    const mouseupHandler = (document.addEventListener as jest.Mock).mock.calls[0][1];
    
    // Simulate mouseup event with whitespace selection
    act(() => {
      mouseupHandler();
    });
    
    expect(onCopyMock).not.toHaveBeenCalled();
  });
  
  it('should not call onCopy multiple times in quick succession', () => {
    // Set up valid selection
    mockSelection.isCollapsed = false;
    mockSelection.toString.mockReturnValue('selected text');
    
    renderHook(() => useTextSelection(onCopyMock));
    
    // Get the mouseup handler
    const mouseupHandler = (document.addEventListener as jest.Mock).mock.calls[0][1];
    
    // Simulate first mouseup event
    act(() => {
      mouseupHandler();
    });
    
    expect(onCopyMock).toHaveBeenCalledTimes(1);
    
    // Reset mock to check if it's called again
    onCopyMock.mockReset();
    
    // Simulate second mouseup event immediately after
    act(() => {
      mouseupHandler();
    });
    
    // Should not be called again due to isProcessing flag
    expect(onCopyMock).not.toHaveBeenCalled();
    
    // Fast-forward past the debounce period
    act(() => {
      vi.advanceTimersByTime(100);
    });
    
    // Simulate third mouseup event after debounce period
    act(() => {
      mouseupHandler();
    });
    
    // Should be called again now
    expect(onCopyMock).toHaveBeenCalledTimes(1);
  });
  
  it('should handle null selection gracefully', () => {
    // Mock getSelection to return null
    (window.getSelection as jest.Mock).mockReturnValue(null);
    
    renderHook(() => useTextSelection(onCopyMock));
    
    // Get the mouseup handler
    const mouseupHandler = (document.addEventListener as jest.Mock).mock.calls[0][1];
    
    // Simulate mouseup event with null selection
    act(() => {
      mouseupHandler();
    });
    
    // Should not throw errors and not call onCopy
    expect(onCopyMock).not.toHaveBeenCalled();
  });
  
  it('should use the provided onCopy callback', () => {
    // Create a custom callback
    const customOnCopy = vi.fn();
    
    // Set up valid selection
    mockSelection.isCollapsed = false;
    mockSelection.toString.mockReturnValue('selected text');
    
    renderHook(() => useTextSelection(customOnCopy));
    
    // Get the mouseup handler
    const mouseupHandler = (document.addEventListener as jest.Mock).mock.calls[0][1];
    
    // Simulate mouseup event
    act(() => {
      mouseupHandler();
    });
    
    // Custom callback should be called
    expect(customOnCopy).toHaveBeenCalledWith('selected text');
    // Default callback should not be called
    expect(onCopyMock).not.toHaveBeenCalled();
  });
  
  it('should update event listener when onCopy changes', () => {
    // Initial render with first callback
    const { rerender } = renderHook(({ callback }) => useTextSelection(callback), {
      initialProps: { callback: onCopyMock }
    });
    
    // Check initial event listener
    expect(document.addEventListener).toHaveBeenCalledWith('mouseup', expect.any(Function));
    expect(document.removeEventListener).not.toHaveBeenCalled();
    
    // Create a new callback
    const newOnCopy = vi.fn();
    
    // Reset mocks to track new calls
    (document.addEventListener as jest.Mock).mockClear();
    (document.removeEventListener as jest.Mock).mockClear();
    
    // Rerender with new callback
    rerender({ callback: newOnCopy });
    
    // Should remove old listener and add new one
    expect(document.removeEventListener).toHaveBeenCalledWith('mouseup', expect.any(Function));
    expect(document.addEventListener).toHaveBeenCalledWith('mouseup', expect.any(Function));
  });
});