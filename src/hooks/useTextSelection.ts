import { useState, useEffect } from 'react';

interface UseTextSelectionProps {
  textareaRef: React.RefObject<HTMLTextAreaElement> | undefined;
}

interface UseTextSelectionReturn {
  selectionStart: number;
  selectionEnd: number;
}

/**
 * Hook to track text selection in a textarea
 */
export function useTextSelection({ 
  textareaRef 
}: UseTextSelectionProps): UseTextSelectionReturn {
  const [selectionStart, setSelectionStart] = useState<number>(0);
  const [selectionEnd, setSelectionEnd] = useState<number>(0);

  useEffect(() => {
    // Guard against undefined ref
    if (!textareaRef || !textareaRef.current) return;

    const textarea = textareaRef.current;

    const handleSelectionChange = () => {
      setSelectionStart(textarea.selectionStart);
      setSelectionEnd(textarea.selectionEnd);
    };

    // Update selection when it changes
    textarea.addEventListener('select', handleSelectionChange);
    textarea.addEventListener('click', handleSelectionChange);
    textarea.addEventListener('keyup', handleSelectionChange);

    // Initial selection state
    setSelectionStart(textarea.selectionStart);
    setSelectionEnd(textarea.selectionEnd);

    return () => {
      textarea.removeEventListener('select', handleSelectionChange);
      textarea.removeEventListener('click', handleSelectionChange);
      textarea.removeEventListener('keyup', handleSelectionChange);
    };
  }, [textareaRef]);

  return { selectionStart, selectionEnd };
}