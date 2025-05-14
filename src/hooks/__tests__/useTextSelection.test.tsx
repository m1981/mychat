import { renderHook } from '@testing-library/react';
import { mockDocumentListeners, createMockTextarea } from '@utils/test-utils';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { useTextSelection } from '../useTextSelection';


describe('useTextSelection', () => {
  beforeEach(() => {
    mockDocumentListeners();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should add selectionchange event listener on mount', () => {
    // Create a mock textarea element using our utility
    const textareaRef = { current: createMockTextarea() };
    
    // Act
    renderHook(() => useTextSelection({ textareaRef }));
    
    // Assert - check only the first argument is 'selectionchange'
    expect(document.addEventListener).toHaveBeenCalled();
    expect(vi.mocked(document.addEventListener).mock.calls[0][0]).toBe('selectionchange');
  });
});