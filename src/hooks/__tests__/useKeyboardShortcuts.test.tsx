
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useKeyboardShortcuts } from '../useKeyboardShortcuts';
import { mockDocumentListeners, createMockEvent } from '@utils/test-utils';

// Mock dependencies
vi.mock('@components/Chat/ChatContent/Message/context/MessageEditorContext', () => ({
  useMessageEditorContext: vi.fn().mockReturnValue({
    handleSave: vi.fn(),
    handleSaveAndSubmit: vi.fn(),
    setIsEdit: vi.fn(),
    setEditContent: vi.fn()
  })
}));

vi.mock('@store/store', () => ({
  default: vi.fn().mockImplementation((selector) => 
    selector({ enterToSubmit: true })
  ),
  getState: vi.fn().mockReturnValue({
    enterToSubmit: true
  })
}));

describe('useKeyboardShortcuts', () => {
  beforeEach(() => {
    mockDocumentListeners();
    vi.clearAllMocks();
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
});