import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock dependencies BEFORE importing any modules that use them
vi.mock('@store/store', () => {
  const mockSetChats = vi.fn();
  const mockState = {
    chats: [
      {
        messages: [
          { role: 'user', content: 'Original message' },
          { role: 'assistant', content: 'Original response' }
        ]
      }
    ],
    currentChatIndex: 0,
    setChats: mockSetChats
  };
  
  const mockUseStore = vi.fn().mockImplementation(selector => {
    // Handle case when called with a selector function
    if (typeof selector === 'function') {
      return selector(mockState);
    }
    // Handle case when called without arguments (direct access)
    return mockState;
  });
  
  // Add getState as a property of the function
  mockUseStore.getState = vi.fn().mockReturnValue(mockState);
  
  return {
    default: mockUseStore
  };
});

// Create a mock handleSubmit function that we can reference in tests
const mockHandleSubmit = vi.fn().mockResolvedValue(undefined);

// Mock useSubmit with a simple implementation
vi.mock('@hooks/useSubmit', () => ({
  useSubmit: () => ({
    handleSubmit: mockHandleSubmit,
    stopGeneration: vi.fn(),
    regenerateMessage: vi.fn(),
    error: null,
    generating: false
  })
}));

// Mock debug utility
vi.mock('@utils/debug', () => ({
  debug: {
    log: vi.fn(),
    error: vi.fn()
  }
}));

// NOW import the modules that depend on the mocks
import { renderHook, act } from '@testing-library/react';
import useStore from '@store/store';

import { useMessageEditor } from '../useMessageEditor';

describe('useMessageEditor - Use Case 3: Edit Existing Message', () => {
  const mockSetIsEdit = vi.fn();
  const mockSetIsEditing = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  it('should update message content and exit edit mode when handleSave is called', async () => {
    // Arrange
    const { result } = renderHook(() => useMessageEditor({
      initialContent: 'Edited message',
      messageIndex: 0,
      isComposer: false,
      setIsEdit: mockSetIsEdit,
      setIsEditing: mockSetIsEditing
    }));
    
    // Act - Call handleSave
    await act(async () => {
      result.current.handleSave();
    });
    
    // Assert
    // 1. Store should be updated with edited message
    expect(useStore().setChats).toHaveBeenCalled();
    
    // Get the updated chats from the last call
    const updatedChats = vi.mocked(useStore().setChats).mock.calls[0][0];
    
    // 2. Message content should be updated
    expect(updatedChats[0].messages[0].content).toBe('Edited message');
    
    // 3. Edit mode should be exited
    expect(mockSetIsEdit).toHaveBeenCalledWith(false);
    
    // 4. Submit should NOT be called (no regeneration)
    expect(mockHandleSubmit).not.toHaveBeenCalled();
  });
  
  it('should append a new message when saving at an index beyond the current messages', async () => {
    // Arrange - Set up with a message index beyond the current messages
    const { result } = renderHook(() => useMessageEditor({
      initialContent: 'New message',
      messageIndex: 2, // Beyond the current messages (which has indices 0 and 1)
      isComposer: false,
      setIsEdit: mockSetIsEdit,
      setIsEditing: mockSetIsEditing
    }));
    
    // Act - Call handleSave
    await act(async () => {
      result.current.handleSave();
    });
    
    // Assert
    // 1. Store should be updated with a new message
    expect(useStore().setChats).toHaveBeenCalled();
    
    // Get the updated chats from the last call
    const updatedChats = vi.mocked(useStore().setChats).mock.calls[0][0];
    
    // 2. A new message should be appended
    expect(updatedChats[0].messages.length).toBe(3); // Original 2 + new one
    
    // 3. The new message should have the correct content
    expect(updatedChats[0].messages[2].content).toBe('New message');
    expect(updatedChats[0].messages[2].role).toBe('user');
  });
  
  it('should handle empty or undefined content gracefully', async () => {
    // Arrange - Set up with empty content
    const { result } = renderHook(() => useMessageEditor({
      initialContent: '',
      messageIndex: 0,
      isComposer: false,
      setIsEdit: mockSetIsEdit,
      setIsEditing: mockSetIsEditing
    }));
    
    // Act - Call handleSave
    await act(async () => {
      result.current.handleSave();
    });
    
    // Assert
    // 1. Store should be updated with empty content
    expect(useStore().setChats).toHaveBeenCalled();
    
    // Get the updated chats from the last call
    const updatedChats = vi.mocked(useStore().setChats).mock.calls[0][0];
    
    // 2. Message content should be empty string, not undefined
    expect(updatedChats[0].messages[0].content).toBe('');
  });
});

describe('useMessageEditor - Composer Mode', () => {
  const mockSetIsEdit = vi.fn();
  const mockSetIsEditing = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock setTimeout
    vi.useFakeTimers();
  });
  
  afterEach(() => {
    vi.useRealTimers();
  });
  
  it('should save, clear content, and submit when handleSaveAndSubmit is called in composer mode', async () => {
    // Arrange
    const { result } = renderHook(() => useMessageEditor({
      initialContent: 'New message',
      messageIndex: 0,
      isComposer: true, // In composer mode
      setIsEdit: mockSetIsEdit,
      setIsEditing: mockSetIsEditing
    }));
    
    // Act - Call handleSaveAndSubmit
    await act(async () => {
      await result.current.handleSaveAndSubmit();
    });
    
    // Assert
    // 1. Store should be updated (via handleSave)
    expect(useStore().setChats).toHaveBeenCalled();
    
    // 2. Content should be cleared
    expect(result.current.editContent).toBe('');
    
    // 3. Submit should be called
    expect(mockHandleSubmit).toHaveBeenCalled();
    
    // 4. Modal should NOT be opened
    expect(result.current.isModalOpen).toBe(false);
  });
});

describe('useMessageEditor - handleSaveAndSubmitWithTruncation', () => {
  const mockSetIsEdit = vi.fn();
  const mockSetIsEditing = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock setTimeout
    vi.useFakeTimers();
  });
  
  afterEach(() => {
    vi.useRealTimers();
  });
  
  it('should update content, truncate messages, and regenerate response', async () => {
    // Arrange - Setup with multiple messages
    // Update the mock store to have multiple messages
    const mockState = {
      chats: [
        {
          messages: [
            { role: 'user', content: 'First message' },
            { role: 'assistant', content: 'First response' },
            { role: 'user', content: 'Second message' },
            { role: 'assistant', content: 'Second response' }
          ]
        }
      ],
      currentChatIndex: 0,
      setChats: vi.fn()
    };
    
    // Update the getState mock to return our new state
    vi.mocked(useStore.getState).mockReturnValue(mockState);
    
    const { result } = renderHook(() => useMessageEditor({
      initialContent: 'Edited first message',
      messageIndex: 0, // Editing the first message
      isComposer: false,
      setIsEdit: mockSetIsEdit,
      setIsEditing: mockSetIsEditing
    }));
    
    // Act - Call handleSaveAndSubmitWithTruncation
    await act(async () => {
      const promise = result.current.handleSaveAndSubmitWithTruncation();
      // Fast-forward timers to resolve the Promise
      vi.advanceTimersByTime(100);
      await promise;
    });
    
    // Assert
    // 1. Store should be updated
    expect(useStore().setChats).toHaveBeenCalled();
    
    // Get the updated chats from the last call
    const updatedChats = vi.mocked(useStore().setChats).mock.calls[0][0];
    
    // 2. Message content should be updated
    expect(updatedChats[0].messages[0].content).toBe('Edited first message');
    
    // 3. Subsequent messages should be truncated (only keep up to index 0)
    expect(updatedChats[0].messages.length).toBe(1);
    
    // 4. Edit mode should be exited
    expect(mockSetIsEdit).toHaveBeenCalledWith(false);
    expect(mockSetIsEditing).toHaveBeenCalledWith(false);
    
    // 5. Modal should be closed
    expect(result.current.isModalOpen).toBe(false);
    
    // 6. Submit should be called to regenerate response
    expect(mockHandleSubmit).toHaveBeenCalled();
  });
});

describe('useMessageEditor - handleModalCancel', () => {
  const mockSetIsEdit = vi.fn();
  const mockSetIsEditing = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock setTimeout
    vi.useFakeTimers();
  });
  
  afterEach(() => {
    vi.useRealTimers();
  });
  
  it('should close modal and restore focus to textarea', async () => {
    // Create a mock textarea with the necessary methods
    const mockTextarea = {
      focus: vi.fn(),
      setSelectionRange: vi.fn(),
      value: 'Test content'
    };
    
    // Render the hook with a ref to our mock textarea
    const { result } = renderHook(() => {
      const hook = useMessageEditor({
        initialContent: 'Test content',
        messageIndex: 0,
        isComposer: false,
        setIsEdit: mockSetIsEdit,
        setIsEditing: mockSetIsEditing
      });
      
      // Manually set the textareaRef.current to our mock
      Object.defineProperty(hook.textareaRef, 'current', {
        value: mockTextarea,
        writable: true
      });
      
      return hook;
    });
    
    // First open the modal
    await act(async () => {
      result.current.setIsModalOpen(true);
    });
    
    // Act - Call handleModalCancel
    await act(async () => {
      result.current.handleModalCancel();
      // Fast-forward timers to execute the setTimeout callback
      vi.advanceTimersByTime(100);
    });
    
    // Assert
    // 1. Modal should be closed
    expect(result.current.isModalOpen).toBe(false);
    
    // 2. Textarea should be focused
    expect(mockTextarea.focus).toHaveBeenCalled();
    
    // 3. Selection range should be set to end of content
    expect(mockTextarea.setSelectionRange).toHaveBeenCalledWith(12, 12); // "Test content" length is actually 12 (might include a hidden character)
  });
  
  it('should handle case when textarea ref is null', async () => {
    // Render the hook with a null textareaRef
    const { result } = renderHook(() => useMessageEditor({
      initialContent: 'Test content',
      messageIndex: 0,
      isComposer: false,
      setIsEdit: mockSetIsEdit,
      setIsEditing: mockSetIsEditing
    }));
    
    // First open the modal
    await act(async () => {
      result.current.setIsModalOpen(true);
    });
    
    // Act - Call handleModalCancel
    await act(async () => {
      result.current.handleModalCancel();
      // Fast-forward timers to execute the setTimeout callback
      vi.advanceTimersByTime(100);
    });
    
    // Assert
    // 1. Modal should be closed
    expect(result.current.isModalOpen).toBe(false);
    
    // 2. No errors should be thrown (this is a passive test)
  });
});