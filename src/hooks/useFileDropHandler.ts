// src/hooks/useFileDropHandler.ts
import { processContent } from '@utils/contentProcessing';
import { useCallback } from 'react';

interface UseFileDropHandlerProps {
  onContentUpdate: (content: string) => void;
  currentContent: string;
}

export const useFileDropHandler = ({ onContentUpdate, currentContent }: UseFileDropHandlerProps) => {
  const handleDragOver = useCallback((e: React.DragEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const files = Array.from(e.dataTransfer.files);
    const cursorPosition = e.currentTarget.selectionStart;

    for (const file of files) {
      if (file.type.startsWith('text/') ||
        file.name.match(/\.(txt|md|js|ts|jsx|tsx|json|css|html|svg)$/)) {
        const content = await file.text();
        const newContent = processContent(content, cursorPosition, currentContent);
        onContentUpdate(newContent);
      }
    }
  }, [currentContent, onContentUpdate]);

  return { handleDragOver, handleDrop };
};