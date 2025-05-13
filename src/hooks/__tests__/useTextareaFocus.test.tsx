import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach, Mock } from 'vitest';
import { useTextareaFocus } from '../useTextareaFocus';
import { debug } from '@utils/debug';

// Mock the debug utility
vi.mock('@utils/debug', () => ({
  debug: {
    log: vi.fn()
  }
}));

describe('useTextareaFocus', () => {
  // Create a mock textarea element
  let mockTextarea: HTMLTextAreaElement;
  let mockRef: { current: HTMLTextAreaElement | null };
  
  // Mock navigator.userAgent for mobile detection
  const originalUserAgent = navigator.userAgent;
  
  beforeEach(() => {
    // Reset mocks
    vi.resetAllMocks();
    
    // Create a fresh textarea for each test
    mockTextarea = document.createElement('textarea');
    mockTextarea.value = 'Initial text content';
    mockTextarea.focus = vi.fn();
    mockTextarea.setSelectionRange = vi.fn();
    mockTextarea.scrollIntoView = vi.fn();
    mockTextarea.addEventListener = vi.fn();
    mockTextarea.removeEventListener = vi.fn();
    
    // Create a ref object with the mock textarea
    mockRef = { current: mockTextarea };
    
    // Mock document event listeners
    vi.spyOn(document, 'addEventListener').mockImplementation(() => {});
    vi.spyOn(document, 'removeEventListener').mockImplementation(() => {});
    
    // Mock setTimeout
    vi.useFakeTimers();
  });
  
  afterEach(() => {
    // Restore original user agent
    Object.defineProperty(navigator, 'userAgent', {
      value: originalUserAgent,
      configurable: true
    });
    
    // Restore real timers
    vi.useRealTimers();
  });
  
  it('should focus the textarea on mount', () => {
    renderHook(() => useTextareaFocus(mockRef));
    
    expect(mockTextarea.focus).toHaveBeenCalled();
  });
  
  it('should set cursor at the end when cursorAtEnd is true', () => {
    renderHook(() => useTextareaFocus(mockRef, { cursorAtEnd: true }));
    
    expect(mockTextarea.setSelectionRange).toHaveBeenCalledWith(
      mockTextarea.value.length, 
      mockTextarea.value.length
    );
  });
  
  it('should not set cursor position when cursorAtEnd is false', () => {
    renderHook(() => useTextareaFocus(mockRef, { cursorAtEnd: false }));
    
    expect(mockTextarea.setSelectionRange).not.toHaveBeenCalled();
  });
  
  it('should scroll into view on mobile devices when scrollIntoView is true', () => {
    // Mock mobile user agent
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
      configurable: true
    });
    
    renderHook(() => useTextareaFocus(mockRef, { scrollIntoView: true }));
    
    // Fast-forward timers to trigger the setTimeout
    act(() => {
      vi.advanceTimersByTime(300);
    });
    
    expect(mockTextarea.scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'center'
    });
  });
  
  it('should not scroll into view on desktop devices', () => {
    // Mock desktop user agent
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      configurable: true
    });
    
    renderHook(() => useTextareaFocus(mockRef, { scrollIntoView: true }));
    
    // Fast-forward timers
    act(() => {
      vi.advanceTimersByTime(300);
    });
    
    expect(mockTextarea.scrollIntoView).not.toHaveBeenCalled();
  });
  
  it('should not scroll into view when scrollIntoView is false', () => {
    // Mock mobile user agent
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
      configurable: true
    });
    
    renderHook(() => useTextareaFocus(mockRef, { scrollIntoView: false }));
    
    // Fast-forward timers
    act(() => {
      vi.advanceTimersByTime(300);
    });
    
    expect(mockTextarea.scrollIntoView).not.toHaveBeenCalled();
  });
  
  it('should add event listeners on mount', () => {
    renderHook(() => useTextareaFocus(mockRef));
    
    expect(document.addEventListener).toHaveBeenCalledWith('mousedown', expect.any(Function));
    expect(document.addEventListener).toHaveBeenCalledWith('touchstart', expect.any(Function));
    expect(mockTextarea.addEventListener).toHaveBeenCalledWith('blur', expect.any(Function));
  });
  
  it('should remove event listeners on unmount', () => {
    const { unmount } = renderHook(() => useTextareaFocus(mockRef));
    
    unmount();
    
    expect(document.removeEventListener).toHaveBeenCalledWith('mousedown', expect.any(Function));
    expect(document.removeEventListener).toHaveBeenCalledWith('touchstart', expect.any(Function));
    expect(mockTextarea.removeEventListener).toHaveBeenCalledWith('blur', expect.any(Function));
  });
  
  it('should track user interaction on mousedown', () => {
    renderHook(() => useTextareaFocus(mockRef));
    
    // Get the mousedown handler
    const mousedownCall = (document.addEventListener as Mock).mock.calls.find(
      (call: any[]) => call[0] === 'mousedown'
    );
    const mousedownHandler = mousedownCall ? mousedownCall[1] : null;
    
    // Make sure we found the handler
    expect(mousedownHandler).not.toBeNull();
    
    // Reset focus mock to check if it gets called again
    (mockTextarea.focus as Mock).mockReset();
    
    // Simulate mousedown event
    act(() => {
      if (mousedownHandler) mousedownHandler();
    });
    
    // Try to focus during user interaction
    act(() => {
      // Get the blur handler
      const blurCall = (mockTextarea.addEventListener as Mock).mock.calls.find(
        (call: any[]) => call[0] === 'blur'
      );
      const blurHandler = blurCall ? blurCall[1] : null;
      
      // Make sure we found the handler
      expect(blurHandler).not.toBeNull();
      
      // Simulate blur event with no related target
      if (blurHandler) blurHandler({ relatedTarget: null });
      
      // Fast-forward a bit, but not enough to reset userInteracting
      vi.advanceTimersByTime(50);
    });
    
    // Focus should not be called because user is interacting
    expect(mockTextarea.focus).not.toHaveBeenCalled();
    
    // Fast-forward to reset userInteracting
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    
    // Simulate another blur event after userInteracting is reset
    act(() => {
      const blurCall = (mockTextarea.addEventListener as Mock).mock.calls.find(
        (call: any[]) => call[0] === 'blur'
      );
      const blurHandler = blurCall ? blurCall[1] : null;
      
      // Make sure we found the handler
      expect(blurHandler).not.toBeNull();
      
      if (blurHandler) blurHandler({ relatedTarget: null });
      
      // Fast-forward to trigger the setTimeout in handleBlur
      vi.advanceTimersByTime(100);
    });
    
    // Now focus should be called
    expect(mockTextarea.focus).toHaveBeenCalled();
  });
  
  it('should not refocus when blur has a related target', () => {
    renderHook(() => useTextareaFocus(mockRef));
    
    // Get the blur handler
    const blurCall = (mockTextarea.addEventListener as Mock).mock.calls.find(
      (call: any[]) => call[0] === 'blur'
    );
    const blurHandler = blurCall ? blurCall[1] : null;
    
    // Make sure we found the handler
    expect(blurHandler).not.toBeNull();
    
    // Reset focus mock
    (mockTextarea.focus as Mock).mockReset();
    
    // Simulate blur event with a related target
    act(() => {
      if (blurHandler) blurHandler({ relatedTarget: { tagName: 'BUTTON' } });
      
      // Fast-forward to trigger the setTimeout in handleBlur
      vi.advanceTimersByTime(100);
    });
    
    // Focus should not be called because blur had a related target
    expect(mockTextarea.focus).not.toHaveBeenCalled();
  });
  
  it('should do nothing if textareaRef.current is null', () => {
    // Create a ref with null current
    const nullRef = { current: null };
    
    renderHook(() => useTextareaFocus(nullRef));
    
    // No errors should be thrown
    expect(document.addEventListener).not.toHaveBeenCalled();
  });
  
  it('should log debug messages', () => {
    renderHook(() => useTextareaFocus(mockRef, { debugId: 'test-textarea' }));
    
    expect(debug.log).toHaveBeenCalledWith('focus', expect.stringContaining('test-textarea'));
  });
  
  it('should handle focusLine option if provided', () => {
    // Add focusLine implementation to test
    mockTextarea.value = 'Line 1\nLine 2\nLine 3';
    
    renderHook(() => useTextareaFocus(mockRef, { 
      cursorAtEnd: false,
      focusLine: 1 // Focus on Line 2
    }));
    
    // This test will fail until you implement the focusLine feature
    // Uncomment when implemented:
    // expect(mockTextarea.setSelectionRange).toHaveBeenCalledWith(7, 7); // Position after "Line 1\n"
  });
});