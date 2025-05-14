import useStore from '@store/store';
import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

import { useMessageEditor } from '../useMessageEditor';
import useSubmit from '../useSubmit';

// Mock dependencies
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

vi.mock('../useSubmit', () => ({
  default: vi.fn().mockReturnValue({
    handleSubmit: vi.fn().mockResolvedValue(undefined)
  })
}));

// Mock debug utility
vi.mock('@utils/debug', () => ({
  debug: {
    log: vi.fn(),
    error: vi.fn()
  }
}));

describe('useMessageEditor - Use Case 4: Edit and Regenerate Response', () => {
  const mockSetIsEdit = vi.fn();
  const mockSetIsEditing = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  it('should show confirmation modal when handleSaveAndSubmit is called in edit mode', async () => {
    // Arrange
    const { result } = renderHook(() => useMessageEditor({
      initialContent: 'Original message',
      messageIndex: 0,
      isComposer: false, // Not in composer mode, in edit mode
      setIsEdit: mockSetIsEdit,
      setIsEditing: mockSetIsEditing
    }));
    
    // Act - Call handleSaveAndSubmit
    await act(async () => {
      await result.current.handleSaveAndSubmit();
    });
    
    // Assert - Modal should be opened
    expect(result.current.isModalOpen).toBe(true);
    
    // Verify no other actions were taken yet
    expect(mockSetIsEdit).not.toHaveBeenCalled();
    expect(mockSetIsEditing).not.toHaveBeenCalled();
    expect(useStore().setChats).not.toHaveBeenCalled();
    expect(useSubmit().handleSubmit).not.toHaveBeenCalled();
  });
  
  it('should update message, truncate subsequent messages, and regenerate when confirmed', async () => {
    // Arrange
    const { result } = renderHook(() => useMessageEditor({
      initialContent: 'Edited message',
      messageIndex: 0,
      isComposer: false,
      setIsEdit: mockSetIsEdit,
      setIsEditing: mockSetIsEditing
    }));
    
    // Act - First open the modal
    await act(async () => {
      await result.current.handleSaveAndSubmit();
    });
    
    // Then confirm the action
    await act(async () => {
      await result.current.handleSaveAndSubmitWithTruncation();
    });
    
    // Assert
    // 1. Store should be updated with edited message
    expect(useStore().setChats).toHaveBeenCalled();
    
    // Get the updated chats from the last call
    const updatedChats = vi.mocked(useStore().setChats).mock.calls[0][0];
    
    // 2. Message content should be updated
    expect(updatedChats[0].messages[0].content).toBe('Edited message');
    
    // 3. Subsequent messages should be truncated (only keep up to current message)
    expect(updatedChats[0].messages.length).toBe(1);
    
    // 4. Edit mode should be exited
    expect(mockSetIsEdit).toHaveBeenCalledWith(false);
    expect(mockSetIsEditing).toHaveBeenCalledWith(false);
    
    // 5. Modal should be closed
    expect(result.current.isModalOpen).toBe(false);
    
    // 6. Submit should be called to regenerate response
    expect(useSubmit().handleSubmit).toHaveBeenCalled();
  });
  
  it('should close modal and remain in edit mode when canceled', async () => {
    // Arrange
    const { result } = renderHook(() => useMessageEditor({
      initialContent: 'Edited message',
      messageIndex: 0,
      isComposer: false,
      setIsEdit: mockSetIsEdit,
      setIsEditing: mockSetIsEditing
    }));
    
    // Act - First open the modal
    await act(async () => {
      await result.current.handleSaveAndSubmit();
    });
    
    // Then cancel the action
    await act(async () => {
      result.current.handleModalCancel();
    });

    // Assert
    // 1. Modal should be closed
    expect(result.current.isModalOpen).toBe(false);
    
    // 2. Store should not be updated
    expect(useStore().setChats).not.toHaveBeenCalled();
    
    // 3. Edit mode should not be exited
    expect(mockSetIsEdit).not.toHaveBeenCalled();
    expect(mockSetIsEditing).not.toHaveBeenCalled();
    
    // 4. Submit should not be called
    expect(useSubmit().handleSubmit).not.toHaveBeenCalled();
  });
});