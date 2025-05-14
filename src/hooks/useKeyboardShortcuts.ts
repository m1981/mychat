import { useCallback, useEffect } from 'react';

import { useMessageEditorContext } from '@components/Chat/ChatContent/Message/context/MessageEditorContext';
import useStore from '@store/store';

export function useKeyboardShortcuts({ customKeyHandler }: { customKeyHandler?: (e: React.KeyboardEvent) => void }) {
  const {
    handleSave,
    handleSaveAndSubmit,
    handleSaveAndSubmitWithTruncation,
    setIsEdit,
    isComposer
  } = useMessageEditorContext();

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Allow custom handler to override default behavior
      if (customKeyHandler) {
        customKeyHandler(e);
        if (e.defaultPrevented) return;
      }

      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|playbook|silk/i.test(
        navigator.userAgent
      );

      // Handle Escape key to exit edit mode
      if (e.key === 'Escape' && !isComposer) {
        e.preventDefault();
        setIsEdit(false);
        return;
      }

      // Handle Enter key for submission
      if (e.key === 'Enter' && !isMobile && !e.nativeEvent.isComposing) {
        const enterToSubmit = useStore.getState().enterToSubmit;

        // For composer mode
        if (isComposer) {
          if (
            (enterToSubmit && !e.shiftKey) ||
            (!enterToSubmit && (e.ctrlKey || e.shiftKey))
          ) {
            e.preventDefault();
            handleSaveAndSubmit();
          }
        } 
        // For edit mode
        else {
          // Ctrl+Shift+Enter for Save & Regenerate
          if (e.ctrlKey && e.shiftKey) {
            e.preventDefault();
            handleSaveAndSubmitWithTruncation();
          } 
          // Ctrl+Enter or Shift+Enter for Save only
          else if (e.ctrlKey || e.shiftKey) {
            e.preventDefault();
            handleSave();
          }
        }
      }
    },
    [customKeyHandler, handleSave, handleSaveAndSubmit, handleSaveAndSubmitWithTruncation, setIsEdit, isComposer]
  );

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
};