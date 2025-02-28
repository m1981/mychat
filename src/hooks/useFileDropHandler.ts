// src/hooks/useFileDropHandler.ts
import { useCallback } from 'react';

import { processContent } from '@utils/contentProcessing';

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
    let cursorPosition = e.currentTarget.selectionStart;
    let accumulatedContent = currentContent;

    try {
    for (const file of files) {
      if (file.type.startsWith('text/') ||
        file.name.match(/\.(txt|md|js|ts|jsx|tsx|json|css|html|svg)$/)) {
          const fileContent = await file.text();

          // Get the file path or name
          // Note: For security reasons, browsers only provide the file name,
          // not the full path
          const filePath = file.webkitRelativePath || file.name;

          // Process this file's content
          accumulatedContent = processContent(
            fileContent,
            cursorPosition,
            accumulatedContent,
            filePath
          );

          // Add a newline between files
          if (files.indexOf(file) < files.length - 1) {
            accumulatedContent += '\n\n';
          }

          // Update cursor position for next file
          cursorPosition = accumulatedContent.length;
      }
    }

      // Update content only once after processing all files
      onContentUpdate(accumulatedContent);
    } catch (error) {
      console.error('Error processing dropped files:', error);
      // Optionally show user-friendly error message
    }
  }, [currentContent, onContentUpdate]);

  return { handleDragOver, handleDrop };
};