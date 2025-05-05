import { useCallback, useEffect } from 'react';
import { useMessageEditorContext } from '@components/Chat/ChatContent/Message/context/MessageEditorContext';
import { useStore } from '@store/store';

interface UseKeyboardShortcutsReturn {
  handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
}

export function useKeyboardShortcuts(): UseKeyboardShortcutsReturn {
  const {
    isComposer,
    setIsEdit,
    handleSave,
    handleSaveAndSubmit,
    resetTextAreaHeight
  } = useMessageEditorContext();

  // Handle keyboard shortcuts in the textarea
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|playbook|silk/i.test(
        navigator.userAgent
      );

    if (e.key === 'Escape' && !isComposer) {
      e.preventDefault();
      setIsEdit(false);
      return;
    }

    if (e.key === 'Enter' && !isMobile && !e.nativeEvent.isComposing) {
      const enterToSubmit = useStore.getState().enterToSubmit;
      if (isComposer) {
        if (
          (enterToSubmit && !e.shiftKey) ||
          (!enterToSubmit && (e.ctrlKey || e.shiftKey))
        ) {
          e.preventDefault();
          handleSaveAndSubmit();
          resetTextAreaHeight();
        }
      } else {
        if (e.ctrlKey && e.shiftKey) {
          e.preventDefault();
          handleSaveAndSubmit();
          resetTextAreaHeight();
        } else if (e.ctrlKey || e.shiftKey) handleSave();
      }
    }
  }, [isComposer, setIsEdit, handleSave, handleSaveAndSubmit, resetTextAreaHeight]);

  // Add global keyboard event listener for Escape key
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isComposer) {
        e.preventDefault();
        setIsEdit(false);
      }
    };

    // Add the event listener
    document.addEventListener('keydown', handleGlobalKeyDown);

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [isComposer, setIsEdit]);

  return { handleKeyDown };
}