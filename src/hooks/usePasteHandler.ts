// src/hooks/usePasteHandler.ts
import { useCallback } from 'react';

import { processContent } from '@utils/contentProcessing';

interface UsePasteHandlerProps {
  onContentUpdate: (content: string) => void;
  currentContent: string;
}

export const usePasteHandler = ({ onContentUpdate, currentContent }: UsePasteHandlerProps) => {
  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pastedContent = e.clipboardData.getData('text');
    const cursorPosition = e.currentTarget.selectionStart;

    const newContent = processContent(pastedContent, cursorPosition, currentContent);

    if (newContent !== currentContent) {
      e.preventDefault(); // Only prevent default if we processed the content
      onContentUpdate(newContent);
    }
  }, [currentContent, onContentUpdate]);

  return { handlePaste };
};