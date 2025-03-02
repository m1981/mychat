// src/hooks/useFileDropHandler.ts
import { useCallback } from 'react';
import { formatDroppedContent } from '@utils/contentProcessing';

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

    const textarea = e.currentTarget;
    const files = Array.from(e.dataTransfer.files);
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    
    try {
      let processedContent = '';
      
      for (const file of files) {
        if (file.type.startsWith('text/') ||
          file.name.match(/\.(txt|md|js|ts|jsx|tsx|json|css|html|svg)$/)) {
          const fileContent = await file.text();
          const filePath = file.webkitRelativePath || file.name;

          // Only format the content, don't join with existing content
          const formattedContent = formatDroppedContent(fileContent, filePath);
          processedContent += formattedContent;
          
          if (files.indexOf(file) < files.length - 1) {
            processedContent += '\n\n';
          }
        }
      }

      if (processedContent) {
        // Let execCommand handle the content joining
        textarea.focus();
        textarea.setSelectionRange(start, end);
        
        if (document.execCommand('insertText', false, processedContent)) {
          onContentUpdate(textarea.value);
        } else {
          // Fallback if execCommand fails
          const beforeContent = textarea.value.substring(0, start);
          const afterContent = textarea.value.substring(end);
          const newContent = beforeContent + processedContent + afterContent;
          
          textarea.value = newContent;
          textarea.setSelectionRange(start + processedContent.length, start + processedContent.length);
          
          onContentUpdate(newContent);
        }
        
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
      }
    } catch (error) {
      console.error('Error processing dropped files:', error);
    }
  }, [currentContent, onContentUpdate]);

  return { handleDragOver, handleDrop };
};