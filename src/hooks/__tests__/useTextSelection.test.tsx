import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useTextSelection } from '../useTextSelection';
import { useRef } from 'react';

describe('useTextSelection', () => {
  beforeEach(() => {
    // Setup specific to this test
  });

  afterEach(() => {
    // Cleanup specific to this test
  });

  test('should add selectionchange event listener on mount', () => {
    // Setup
    vi.spyOn(document, 'addEventListener');
    
    // Create a mock textarea element
    const textareaElement = document.createElement('textarea');
    const textareaRef = { current: textareaElement };
    
    // Act
    renderHook(() => useTextSelection({ textareaRef }));
    
    // Assert
    expect(document.addEventListener).toHaveBeenCalled();
    const calls = vi.mocked(document.addEventListener).mock.calls;
    const hasMouseupOrSelectionChange = calls.some(call => 
      call[0] === 'mouseup' || call[0] === 'selectionchange'
    );
    expect(hasMouseupOrSelectionChange).toBe(true);
  });
});