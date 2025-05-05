import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useMessageEditor } from '../useMessageEditor';
import { useStore } from '@store/store';

// Mock the useStore hook
vi.mock('@store/store', () => ({
  useStore: vi.fn()
}));

describe('useMessageEditor', () => {
  const mockUpdateMessage = vi.fn();
  const mockSubmitMessage = vi.fn();
  const mockSetIsEdit = vi.fn();
  const mockSetIsEditing = vi.fn();
  
  beforeEach(() => {
    // Reset all mocks
    vi.resetAllMocks();
    
    // Setup mock return values
    (useStore as any).mockReturnValue({
      updateMessage: mockUpdateMessage,
      submitMessage: mockSubmitMessage
    });
  });
  
  it('should initialize with the provided content', () => {
    const { result } = renderHook(() => useMessageEditor({
      initialContent: 'Initial content',
      messageIndex: 0,
      isComposer: false,
      setIsEdit: mockSetIsEdit,
      setIsEditing: mockSetIsEditing
    }));
    
    expect(result.current.editContent).toBe('Initial content');
  });
  
  it('should update content when setEditContent is called', () => {
    const { result } = renderHook(() => useMessageEditor({
      initialContent: 'Initial content',
      messageIndex: 0,
      isComposer: false,
      setIsEdit: mockSetIsEdit,
      setIsEditing: mockSetIsEditing
    }));
    
    act(() => {
      result.current.setEditContent('Updated content');
    });
    
    expect(result.current.editContent).toBe('Updated content');
  });
  
  it('should call updateMessage and exit edit mode when handleSave is called (non-composer)', () => {
    const { result } = renderHook(() => useMessageEditor({
      initialContent: 'Initial content',
      messageIndex: 1,
      isComposer: false,
      setIsEdit: mockSetIsEdit,
      setIsEditing: mockSetIsEditing
    }));
    
    // First update the content
    act(() => {
      result.current.setEditContent('Updated content');
    });
    
    // Then call handleSave in a separate act
    act(() => {
      result.current.handleSave();
    });
    
    expect(mockUpdateMessage).toHaveBeenCalledWith(1, 'Updated content');
    expect(mockSetIsEdit).toHaveBeenCalledWith(false);
    expect(mockSetIsEditing).toHaveBeenCalledWith(false);
  });
  
  it('should not exit edit mode when handleSave is called (composer)', () => {
    const { result } = renderHook(() => useMessageEditor({
      initialContent: 'Initial content',
      messageIndex: 0,
      isComposer: true,
      setIsEdit: mockSetIsEdit,
      setIsEditing: mockSetIsEditing
    }));
    
    act(() => {
      result.current.handleSave();
    });
    
    expect(mockUpdateMessage).toHaveBeenCalledWith(0, 'Initial content');
    expect(mockSetIsEdit).not.toHaveBeenCalled();
    expect(mockSetIsEditing).not.toHaveBeenCalled();
  });
  
  it('should call submitMessage when handleSaveAndSubmit is called (composer)', async () => {
    const { result } = renderHook(() => useMessageEditor({
      initialContent: 'Initial content',
      messageIndex: 0,
      isComposer: true,
      setIsEdit: mockSetIsEdit,
      setIsEditing: mockSetIsEditing
    }));
    
    await act(async () => {
      await result.current.handleSaveAndSubmit();
    });
    
    expect(mockUpdateMessage).toHaveBeenCalledWith(0, 'Initial content');
    expect(mockSubmitMessage).toHaveBeenCalledWith('Initial content');
    expect(result.current.editContent).toBe('');
  });
});