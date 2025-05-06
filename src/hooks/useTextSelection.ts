import { useEffect, useRef } from 'react';

export const useTextSelection = (onCopy: (text: string) => void) => {
  const isProcessing = useRef(false);

  useEffect(() => {
    const handleSelection = () => {
      if (isProcessing.current) return;

      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) return;

      const selectedText = selection.toString().trim();
      if (selectedText) {
        isProcessing.current = true;
        onCopy(selectedText);

        setTimeout(() => {
          isProcessing.current = false;
        }, 100);
      }
    };

    document.addEventListener('mouseup', handleSelection);
    return () => document.removeEventListener('mouseup', handleSelection);
  }, [onCopy]);
};