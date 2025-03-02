// src/hooks/usePasteHandler.ts
import { useCallback } from 'react';

interface UsePasteHandlerProps {
  onContentUpdate: (content: string) => void;
}

interface UndoStackEntry {
  value: string;
  selectionStart: number;
  selectionEnd: number;
}

export const usePasteHandler = ({ onContentUpdate }: UsePasteHandlerProps) => {
  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    
    const textarea = e.currentTarget;
    const pastedContent = e.clipboardData.getData('text');
    
    // Use execCommand to maintain undo stack
    if (document.execCommand('insertText', false, pastedContent)) {
      // execCommand was successful, React won't know about the change
      onContentUpdate(textarea.value);
    } else {
      // Fallback for browsers where execCommand isn't available
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      
      // Update the textarea value
      const beforeContent = textarea.value.substring(0, start);
      const afterContent = textarea.value.substring(end);
      const newContent = beforeContent + pastedContent + afterContent;
      
      textarea.value = newContent;
      
      // Set cursor position
      const newPosition = start + pastedContent.length;
      textarea.setSelectionRange(newPosition, newPosition);
      
      // Notify React
      onContentUpdate(newContent);
    }
    
    // Ensure input event is fired for any other listeners
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  }, [onContentUpdate]);

  return { handlePaste };
};